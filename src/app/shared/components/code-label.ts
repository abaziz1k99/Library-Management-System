import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

const CODE39: Record<string, string> = {
    '0': 'nnnwwnwnn',
    '1': 'wnnwnnnnw',
    '2': 'nnwwnnnnw',
    '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw',
    '5': 'wnnwwnnnn',
    '6': 'nnwwwnnnn',
    '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn',
    '9': 'nnwwnnwnn',
    A: 'wnnnnwnnw',
    B: 'nnwnnwnnw',
    C: 'wnwnnwnnn',
    D: 'nnnnwwnnw',
    E: 'wnnnwwnnn',
    F: 'nnwnwwnnn',
    G: 'nnnnnwwnw',
    H: 'wnnnnwwnn',
    I: 'nnwnnwwnn',
    J: 'nnnnwwwnn',
    K: 'wnnnnnnww',
    L: 'nnwnnnnww',
    M: 'wnwnnnnwn',
    N: 'nnnnwnnww',
    O: 'wnnnwnnwn',
    P: 'nnwnwnnwn',
    Q: 'nnnnnnwww',
    R: 'wnnnnnwwn',
    S: 'nnwnnnwwn',
    T: 'nnnnwnwwn',
    U: 'wwnnnnnnw',
    V: 'nwwnnnnnw',
    W: 'wwwnnnnnn',
    X: 'nwnnwnnnw',
    Y: 'wwnnwnnnn',
    Z: 'nwwnwnnnn',
    '-': 'nwnnnnwnw',
    '.': 'wwnnnnwnn',
    ' ': 'nwwnnnwnn',
    '$': 'nwnwnwnnn',
    '/': 'nwnwnnnwn',
    '+': 'nwnnnwnwn',
    '%': 'nnnwnwnwn',
    '*': 'nwnnwnwnn'
};

export interface BarcodeBar {
    x: number;
    width: number;
}

@Component({
    selector: 'app-code-label',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="flex flex-col items-center gap-1">
            @if (kind === 'qr') {
                <svg [attr.viewBox]="'0 0 ' + (matrixSize + 2) + ' ' + (matrixSize + 2)" class="bg-white rounded" [style.width.px]="size" [style.height.px]="size" role="img" [attr.aria-label]="'QR code for ' + value">
                    <rect [attr.width]="matrixSize + 2" [attr.height]="matrixSize + 2" fill="#ffffff"></rect>
                    @for (row of qrMatrix(); track $index; let y = $index) {
                        @for (cell of row; track $index; let x = $index) {
                            @if (cell) {
                                <rect [attr.x]="x + 1" [attr.y]="y + 1" width="1" height="1" fill="#111827"></rect>
                            }
                        }
                    }
                </svg>
            } @else {
                <svg [attr.viewBox]="'0 0 ' + barcodeWidth() + ' 44'" [style.width.px]="size * 2" height="44" class="bg-white rounded" role="img" [attr.aria-label]="'Barcode for ' + value">
                    <rect [attr.width]="barcodeWidth()" height="44" fill="#ffffff"></rect>
                    @for (bar of barcodeBars(); track $index) {
                        <rect [attr.x]="bar.x" y="0" [attr.width]="bar.width" height="44" fill="#111827"></rect>
                    }
                </svg>
            }
            <span class="text-[10px] font-mono tracking-wider text-muted-color text-center break-all">{{ value }}</span>
            @if (caption) {
                <span class="text-[10px] text-muted-color text-center">{{ caption }}</span>
            }
        </div>
    `
})
export class CodeLabel {
    @Input() value = '';
    @Input() kind: 'barcode' | 'qr' = 'barcode';
    @Input() size = 96;
    @Input() caption = '';

    readonly matrixSize = 21;

    barcodeBars(): BarcodeBar[] {
        const text = `*${this.value.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '')}*`;
        const bars: BarcodeBar[] = [];
        let x = 0;
        for (const char of text) {
            const pattern = CODE39[char] ?? CODE39['-'];
            let index = 0;
            let isBar = true;
            for (const element of pattern) {
                const width = element === 'w' ? 3 : 1;
                if (isBar) bars.push({ x, width });
                x += width;
                isBar = !isBar;
                index += 1;
            }
            x += 1;
            void index;
        }
        return bars;
    }

    barcodeWidth(): number {
        return Math.max(10, Math.ceil(this.barcodeBars().reduce((max, bar) => Math.max(max, bar.x + bar.width), 0) + 4));
    }

    qrMatrix(): boolean[][] {
        const size = this.matrixSize;
        const matrix: boolean[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

        const setFinder = (originX: number, originY: number): void => {
            for (let y = 0; y < 7; y += 1) {
                for (let x = 0; x < 7; x += 1) {
                    const edge = x === 0 || y === 0 || x === 6 || y === 6;
                    const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
                    matrix[originY + y][originX + x] = edge || core;
                }
            }
            for (let y = -1; y <= 7; y += 1) {
                for (let x = -1; x <= 7; x += 1) {
                    const px = originX + x;
                    const py = originY + y;
                    if (px < 0 || py < 0 || px >= size || py >= size) continue;
                    if (x === -1 || y === -1 || x === 7 || y === 7) matrix[py][px] = false;
                }
            }
        };

        setFinder(0, 0);
        setFinder(size - 7, 0);
        setFinder(0, size - 7);

        for (let i = 8; i < size - 8; i += 1) {
            matrix[6][i] = i % 2 === 0;
            matrix[i][6] = i % 2 === 0;
        }

        const seed = this.hash(this.value);
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                if (this.isReserved(x, y, size)) continue;
                const bit = (seed ^ Math.imul(x + 7, 73856093) ^ Math.imul(y + 11, 19349663)) >>> 0;
                matrix[y][x] = (bit & 7) < 4;
            }
        }
        return matrix;
    }

    private isReserved(x: number, y: number, size: number): boolean {
        const inFinder = (gx: number, gy: number): boolean => x >= gx - 1 && x <= gx + 7 && y >= gy - 1 && y <= gy + 7;
        if (inFinder(0, 0) || inFinder(size - 7, 0) || inFinder(0, size - 7)) return true;
        return x === 6 || y === 6;
    }

    private hash(value: string): number {
        let hash = 2166136261;
        for (let i = 0; i < value.length; i += 1) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }
}
