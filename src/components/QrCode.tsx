import { useEffect, useState } from "react";

type Props = {
  /** What the code says. It is drawn in the browser: it never leaves the page. */
  value: string;
  /** Text for people who cannot see the picture. */
  label: string;
  size?: number;
};

/**
 * A QR code drawn locally. The library is loaded only when a code is needed, and the picture is an
 * SVG shown through an `<img>`, so nothing in it can run. The value is never sent anywhere: for an
 * authenticator app it is the secret.
 */
export function QrCode({ value, label, size = 192 }: Props) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setSource(null);
    import("qrcode")
      .then((qr) => qr.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" }))
      .then((svg) => {
        if (current) setSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      })
      .catch(() => {
        // The text of the key is on screen as well: the user can still type it.
        if (current) setSource(null);
      });
    return () => {
      current = false;
    };
  }, [value]);

  if (!source)
    return <div className="qr-code qr-code-empty" style={{ width: size, height: size }} />;
  return <img className="qr-code" src={source} alt={label} width={size} height={size} />;
}
