import { useState } from 'react';
import { assetUrl } from '../lib/api';

/** Image with lazy loading and a neutral fallback if the source fails. */
export default function Img({ src, alt, className = '', ...rest }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label={alt} className={`flex items-center justify-center overflow-hidden bg-mist text-stone [container-type:inline-size] ${className}`}>
        {alt && <span className="line-clamp-3 px-[8%] text-center font-display text-[clamp(0px,8cqw,1.125rem)] italic leading-tight">{alt}</span>}
      </div>
    );
  }
  return <img src={assetUrl(src)} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={className} {...rest} />;
}
