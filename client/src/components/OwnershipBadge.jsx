import React from 'react';
import { Landmark } from 'lucide-react';
import { Badge } from './Badge';
import { OWNERSHIP, OWNERSHIP_LABELS, OWNERSHIP_NOT_SPECIFIED } from '../constants/hospital';

const VARIANT = { [OWNERSHIP.GOVERNMENT]: 'primary', [OWNERSHIP.SEMI_GOVERNMENT]: 'warning', [OWNERSHIP.PRIVATE]: 'neutral' };

/** Hospital ownership. Text always accompanies the colour; hospitals registered before the field show "Not specified". */
export function OwnershipBadge({ ownership, size = 'sm', className }) {
  const label = OWNERSHIP_LABELS[ownership];
  return (
    <Badge variant={label ? VARIANT[ownership] : 'neutral'} size={size} icon={Landmark} className={className} data-testid="ownership-badge">
      {label ?? OWNERSHIP_NOT_SPECIFIED}
    </Badge>
  );
}
