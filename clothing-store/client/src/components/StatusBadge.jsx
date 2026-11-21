import { STATUS_STYLE } from '../lib/format';

export default function StatusBadge({ status }) {
  return <span className={`badge whitespace-nowrap ${STATUS_STYLE[status] || 'bg-mist'}`}>{status}</span>;
}
