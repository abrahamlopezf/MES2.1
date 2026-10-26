import React, { useState } from 'react';
import { Blobatar } from '@blobatar/react';

interface UserAvatarProps {
  /** Stable identity (user id, username or email) used to generate the same face everywhere. */
  name: string;
  label: string;
  src?: string | null;
  size?: number;
  className?: string;
}

/** A photo when available, otherwise a deterministic Blobatar avatar. */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  label,
  src,
  size = 40,
  className = '',
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(src) && failedSrc !== src;
  const seed = name.trim() || label.trim() || 'traceflow-user';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[1.15rem] border border-primary/35 bg-background p-[3px] shadow-sm ${className}`}
      style={{ width: size + 6, height: size + 6 }}
    >
      {showPhoto ? (
        <img
          src={src!}
          alt=""
          loading="lazy"
          className="block h-full w-full rounded-[0.9rem] object-cover"
          onError={() => setFailedSrc(src || null)}
        />
      ) : (
        <Blobatar
          name={seed}
          size={size}
          background="squircle"
          alt=""
          className="block h-full w-full rounded-[0.9rem] object-cover"
        />
      )}
    </span>
  );
};

export default UserAvatar;
