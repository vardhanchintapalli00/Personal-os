import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET(req: Request) {
  const raw = Number(new URL(req.url).searchParams.get('size'));
  const size = raw === 192 ? 192 : 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: 'white',
          fontSize: size * 0.5,
          fontWeight: 800,
        }}
      >
        L
      </div>
    ),
    { width: size, height: size },
  );
}
