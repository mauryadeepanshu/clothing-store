import Modal from './Modal';

export const TABLES = {
  apparel: {
    title: 'Tops, dresses, jackets and knitwear',
    note: 'Body measurements in centimetres. Between sizes? Size up for a relaxed fit.',
    head: ['Size', 'Chest / bust', 'Waist', 'Hip'],
    rows: [['XS', '81–86', '61–66', '86–91'], ['S', '86–91', '66–71', '91–96'], ['M', '91–99', '71–79', '96–104'], ['L', '99–107', '79–87', '104–112'], ['XL', '107–115', '87–95', '112–120']],
  },
  waist: {
    title: 'Jeans, chinos and trousers',
    note: 'Waist size in inches. Measure around your natural waistline.',
    head: ['Size', 'Waist (in)', 'Waist (cm)', 'Hip (cm)'],
    rows: [['26', '26', '66', '89'], ['28', '28', '71', '94'], ['30', '30', '76', '99'], ['32', '32', '81', '104'], ['34', '34', '86', '109'], ['36', '36', '91', '114']],
  },
  shoes: {
    title: 'Footwear',
    note: 'Foot length in centimetres, heel to longest toe.',
    head: ['UK', 'EU', 'US (men)', 'Foot length'],
    rows: [['6', '39', '7', '24.6'], ['7', '40.5', '8', '25.4'], ['8', '42', '9', '26.2'], ['9', '43', '10', '27.1'], ['10', '44.5', '11', '27.9'], ['11', '46', '12', '28.8']],
  },
};

export const guideFor = (sizes = []) => {
  const names = sizes.map((s) => s.name || s);
  if (names.some((n) => n.startsWith('UK'))) return 'shoes';
  if (names.some((n) => /^\d+$/.test(n))) return 'waist';
  if (names.every((n) => n === 'Free Size')) return null;
  return 'apparel';
};

export function SizeTable({ kind }) {
  const t = TABLES[kind];
  return (
    <div>
      <h3 className="font-sans text-base font-medium">{t.title}</h3>
      <p className="mt-1 text-sm text-stone">{t.note}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="table-x min-w-[380px]">
          <thead><tr>{t.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{t.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export default function SizeGuideModal({ open, onClose, kind }) {
  return (
    <Modal open={open} onClose={onClose} title="Size guide">
      {kind ? <SizeTable kind={kind} /> : <p className="text-sm">This item is one size and fits most.</p>}
      <p className="mt-6 text-sm text-stone">Measure over light clothing with a soft tape. Still unsure? You can request a size exchange from your account after delivery.</p>
    </Modal>
  );
}
