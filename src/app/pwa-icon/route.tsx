import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// ?size=192|512            -> rounded icon with transparent corners
// ?size=512&mask=1         -> full-bleed square for Android's adaptive ("maskable") icons
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const size = Number(params.get('size')) === 192 ? 192 : 512;
  const maskable = params.get('mask') === '1';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: 'transparent' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: maskable ? 0 : Math.round(size * 0.24),
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white',
            fontSize: Math.round(size * (maskable ? 0.4 : 0.52)),
            fontWeight: 800,
          }}
        >
          L
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
