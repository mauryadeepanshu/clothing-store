export default function Field({ label, error, as = 'input', className = '', children, ...props }) {
  const Comp = as;
  const id = props.id || props.name;
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <Comp id={id} className={`input ${error ? 'input-error' : ''}`} aria-invalid={Boolean(error)} {...props}>
        {children}
      </Comp>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
