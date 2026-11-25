import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// ?size=192|512            -> rounded icon with transparent corners
// ?size=512&mask=1         -> full-bleed square for Android's adaptive ("maskable") icons
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const size = Number(params.get('size')) === 192 ? 192 : 512;
  const maskable = params.get('mask') === '1';
  if (params.get('badge') === '1') {
    // Status-bar icon: Android only uses the shape, so draw a plain white sparkle on transparent.
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" /></svg>
        </div>
      ),
      { width: 96, height: 96 },
    );
  }
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
