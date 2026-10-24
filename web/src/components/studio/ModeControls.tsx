'use client';

import { CaretDownIcon } from '@phosphor-icons/react';
import { useId, type CSSProperties } from 'react';
import type { AnimationParameter, AnimationValues } from '@/lib/animations';

export function RangeField({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }) {
  const id = useId();
  return <div className="studio-field studio-slider-field"><label htmlFor={id}>{label}<output htmlFor={id}>{Number(value.toFixed(2))}{unit}</output></label><input id={id} aria-label={label} type="range" min={min} max={max} step={step} value={value} style={{ '--range-fill': `${(value - min) / (max - min) * 100}%` } as CSSProperties} onChange={event => onChange(Number(event.target.value))} /></div>;
}
export function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  const id = useId();
  return <div className="studio-field"><label htmlFor={id}>{label}</label><div className="studio-select"><select id={id} value={value} onChange={event => onChange(event.target.value as T)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><CaretDownIcon size={14} /></div></div>;
}
export function ParameterFields({ schema, values, onChange }: { schema: readonly AnimationParameter[]; values: AnimationValues; onChange: (values: AnimationValues) => void }) {
  return schema.map(parameter => parameter.kind === 'range'
    ? <RangeField key={parameter.id} label={parameter.label} value={values[parameter.id] ?? parameter.default} min={parameter.min} max={parameter.max} step={parameter.step} unit={parameter.unit ? ` ${parameter.unit}` : ''} onChange={value => onChange({ ...values, [parameter.id]: value })} />
    : <SelectField key={parameter.id} label={parameter.label} value={String(values[parameter.id] ?? parameter.default)} options={parameter.options.map(option => ({ value: String(option.value), label: option.label }))} onChange={value => onChange({ ...values, [parameter.id]: Number(value) })} />);
}
