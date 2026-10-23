import * as React from 'react';

/**
 * Classic "digital rain" drawn on a 2D canvas that fills its parent.
 * Used on the 3D computer's screen; it is a plain DOM component, so it can be reused anywhere.
 *
 * Characters: half-width katakana + digits, like the film titles.
 * Respects prefers-reduced-motion (draws a single still frame).
 */
type MatrixCodeRainProps = {
    className?: string;
    /** Glyph size in CSS pixels. */
    fontSize?: number;
    /** Head (leading glyph) colour. */
    headColor?: string;
    /** Trail colour. */
    color?: string;
    /** Frames per second. Lower = calmer. */
    fps?: number;
};

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:.=*+-<>¦';

export default function MatrixCodeRain({
    className,
    fontSize = 14,
    headColor = '#d7ffd9',
    color = '#00ff41',
    fps = 22
}: MatrixCodeRainProps) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        const parent = canvas?.parentElement;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !parent || !ctx) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let drops: number[] = [];
        let width = 0;
        let height = 0;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = parent.clientWidth;
            height = parent.clientHeight;
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const columns = Math.ceil(width / fontSize);
            // Start each column at a random height so the rain is already falling on first paint.
            drops = Array.from({ length: columns }, () => Math.floor((Math.random() * height) / fontSize) - 20);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
        };

        const draw = () => {
            // Translucent black wash leaves fading trails behind each head glyph.
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.fillRect(0, 0, width, height);
            ctx.font = `${fontSize}px "Courier New", monospace`;
            ctx.textBaseline = 'top';
            for (let i = 0; i < drops.length; i++) {
                const y = drops[i] * fontSize;
                if (y >= 0) {
                    const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                    ctx.fillStyle = color;
                    ctx.fillText(glyph, i * fontSize, y - fontSize);
                    ctx.fillStyle = headColor;
                    ctx.fillText(glyph, i * fontSize, y);
                }
                if (y > height && Math.random() > 0.975) drops[i] = Math.floor(Math.random() * -12);
                drops[i]++;
            }
        };

        resize();
        if (reducedMotion) {
            for (let i = 0; i < 60; i++) draw();
            return;
        }

        let raf = 0;
        let last = 0;
        const frameMs = 1000 / fps;
        const loop = (now: number) => {
            raf = requestAnimationFrame(loop);
            if (document.hidden || now - last < frameMs) return;
            last = now;
            draw();
        };
        raf = requestAnimationFrame(loop);

        const observer = new ResizeObserver(resize);
        observer.observe(parent);
        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
        };
    }, [fontSize, headColor, color, fps]);

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
