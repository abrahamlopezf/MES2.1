const DEFAULT_SHIFT_SCHEDULE = {
  shifts: [
    { code: 'TURNO_1', label: 'Turno 1', start_time: '06:00', end_time: '18:00', duration_hours: 12 },
    { code: 'TURNO_2', label: 'Turno 2', start_time: '18:00', end_time: '06:00', duration_hours: 12 },
  ],
};

function getExtrusionShiftWindow(shiftDate, shiftCode, schedule = DEFAULT_SHIFT_SCHEDULE) {
  const code = String(shiftCode || '').trim().toUpperCase();
  const shift = (schedule?.shifts || DEFAULT_SHIFT_SCHEDULE.shifts).find((item) => String(item.code).toUpperCase() === code);
  const parseTime = (value) => {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const startMinute = parseTime(shift?.start_time);
  const endMinute = parseTime(shift?.end_time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(shiftDate || '')) || !shift || startMinute == null || endMinute == null) {
    throw Object.assign(new Error('Fecha o turno inválido.'), { statusCode: 400 });
  }
  // Planta usa hora CDMX (UTC-06:00); shiftDate representa el día en que inicia el turno.
  const format = (minute) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00`;
  const start = new Date(`${shiftDate}T${format(startMinute)}-06:00`);
  const end = new Date(`${shiftDate}T${format(endMinute)}-06:00`);
  if (endMinute <= startMinute) end.setUTCDate(end.getUTCDate() + 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw Object.assign(new Error('Fecha de turno inválida.'), { statusCode: 400 });
  }
  return { start, end };
}

const getMexicoCityParts = (instant) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
};

function getShiftDateForInstant(date = new Date(), schedule = DEFAULT_SHIFT_SCHEDULE) {
  const current = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(current.getTime())) throw new Error('Fecha actual inválida.');
  const { date: calendarDate, minutes } = getMexicoCityParts(current);
  const firstShift = (schedule?.shifts || DEFAULT_SHIFT_SCHEDULE.shifts)
    .map((shift) => ({ shift, minutes: Number(String(shift.start_time).slice(0, 2)) * 60 + Number(String(shift.start_time).slice(3, 5)) }))
    .sort((a, b) => a.minutes - b.minutes)[0];
  if (!firstShift || minutes >= firstShift.minutes) return calendarDate;
  const previous = new Date(`${calendarDate}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return previous.toISOString().slice(0, 10);
}

function getShiftCodeForInstant(date = new Date(), schedule = DEFAULT_SHIFT_SCHEDULE) {
  const current = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(current.getTime())) throw new Error('Fecha actual inválida.');
  const { minutes } = getMexicoCityParts(current);
  const shifts = schedule?.shifts || DEFAULT_SHIFT_SCHEDULE.shifts;
  for (const shift of shifts) {
    const start = Number(String(shift.start_time).slice(0, 2)) * 60 + Number(String(shift.start_time).slice(3, 5));
    const end = Number(String(shift.end_time).slice(0, 2)) * 60 + Number(String(shift.end_time).slice(3, 5));
    const contains = end > start ? minutes >= start && minutes < end : minutes >= start || minutes < end;
    if (contains) return shift.code;
  }
  return shifts[0]?.code || 'TURNO_1';
}

function calculateShiftBalance({
  goodOutputKg = 0,
  mixtureInputKg,
  openingMixtureKg = 0,
  loadedMixtureKg,
  closingRemnantKg = 0,
  mixtureScrapKg = 0,
  purgeKg = 0,
  actualScrapKg = 0,
}) {
  const hasDetailedBalance = loadedMixtureKg != null || openingMixtureKg > 0 || closingRemnantKg > 0;
  const values = [
    goodOutputKg, mixtureScrapKg, purgeKg, actualScrapKg,
    openingMixtureKg,
    loadedMixtureKg == null ? (mixtureInputKg == null ? Number(goodOutputKg) + Number(mixtureScrapKg) : mixtureInputKg) : loadedMixtureKg,
    closingRemnantKg,
  ].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('El balance del turno requiere cantidades finitas no negativas.');
  }
  const [good, mixtureScrap, purge, actual, opening, loaded, remnant] = values;
  const mixtureInput = hasDetailedBalance ? opening + loaded : loaded;
  const totalInputKg = mixtureInput + purge;
  // El purgante se registra como entrada independiente y no es mezcla
  // transformable a PTI. El balance de PTI debe usar solo mezcla disponible:
  // mezcla inicial + cargada - remanente - merma/scrap de mezcla.
  const consumedMixtureKg = Math.max(0, mixtureInput - remnant);
  const consumedInputKg = Math.max(0, totalInputKg - remnant);
  const theoreticalGoodOutputKg = Math.max(0, consumedMixtureKg - actual);
  const theoreticalScrapKg = Math.max(0, consumedMixtureKg - good);
  return {
    good_output_kg: Number(good.toFixed(3)),
    theoretical_good_output_kg: Number(theoreticalGoodOutputKg.toFixed(3)),
    opening_mixture_kg: Number(opening.toFixed(3)),
    loaded_mixture_kg: Number(loaded.toFixed(3)),
    mixture_input_kg: Number(mixtureInput.toFixed(3)),
    closing_remnant_kg: Number(remnant.toFixed(3)),
    consumed_mixture_kg: Number(consumedMixtureKg.toFixed(3)),
    consumed_input_kg: Number(consumedInputKg.toFixed(3)),
    mixture_scrap_kg: Number(mixtureScrap.toFixed(3)),
    purge_input_kg: Number(purge.toFixed(3)),
    total_input_kg: Number(totalInputKg.toFixed(3)),
    theoretical_scrap_kg: Number(theoreticalScrapKg.toFixed(3)),
    actual_scrap_kg: Number(actual.toFixed(3)),
    variance_kg: Number((actual - theoreticalScrapKg).toFixed(3)),
  };
}

function allocateVarianceByInput(mixes, varianceKg) {
  const rows = (mixes || []).map((mix) => ({
    mixture_qr: mix.mixture_qr,
    input_kg: Math.max(0, Number(mix.input_kg) || 0),
  }));
  const totalInput = rows.reduce((sum, mix) => sum + mix.input_kg, 0);
  const variance = Number(varianceKg) || 0;
  if (!rows.length || totalInput <= 0) return rows.map((mix) => ({ ...mix, variance_kg: 0 }));
  let allocated = 0;
  return rows.map((mix, index) => {
    const amount = index === rows.length - 1
      ? Number((variance - allocated).toFixed(3))
      : Number((variance * mix.input_kg / totalInput).toFixed(3));
    allocated += amount;
    return { ...mix, variance_kg: amount };
  });
}

function addOperationalScrapInput(mixtureInputByQr, scrapLog, amountKg) {
  if (scrapLog?.source_production_entry_id) return false;
  const qr = scrapLog?.from_mixture_qr_id;
  if (!qr || qr === 'MATERIAL_PURGA') return false;
  const amount = Math.max(0, Number(amountKg) || 0);
  mixtureInputByQr.set(qr, Number((Number(mixtureInputByQr.get(qr) || 0) + amount).toFixed(3)));
  return true;
}

function calculatePtiOutputEstimate(entries = [], consumedKg = null) {
  let usefulPtiKg = 0;
  let observedPieces = 0;
  let standardWeightTotal = 0;
  let standardWeightPieces = 0;
  for (const entry of entries) {
    const pieces = Math.max(0, Number(entry.pieces) || 0);
    const standardWeight = Number(entry.standard_unit_weight_kg);
    const netWeight = Math.max(0, Number(entry.net_weight_kg) || 0);
    const weightSource = String(entry.weight_source || '').trim().toUpperCase();
    usefulPtiKg += weightSource === 'BASCULA'
      ? netWeight
      : entry.standard_unit_weight_kg != null && Number.isFinite(standardWeight) && standardWeight > 0
        ? pieces * standardWeight
        : netWeight;
    observedPieces += pieces;
    if (entry.standard_unit_weight_kg != null && Number.isFinite(standardWeight) && standardWeight > 0 && pieces > 0) {
      standardWeightTotal += standardWeight * pieces;
      standardWeightPieces += pieces;
    }
  }
  const averageStandardWeightKg = standardWeightPieces > 0 ? standardWeightTotal / standardWeightPieces : null;
  const consumed = consumedKg == null ? null : Math.max(0, Number(consumedKg) || 0);
  return {
    useful_pti_kg: Number(usefulPtiKg.toFixed(3)),
    observed_pieces: observedPieces,
    average_standard_unit_weight_kg: averageStandardWeightKg == null ? null : Number(averageStandardWeightKg.toFixed(6)),
    estimated_pieces_from_consumed_kg: consumed == null || averageStandardWeightKg == null
      ? null
      : Math.floor(consumed / averageStandardWeightKg),
  };
}

function hasQualifyingShiftActivity({ productionEntries = 0, preparedMixes = 0, transitions = 0 } = {}) {
  return Number(productionEntries) + Number(preparedMixes) + Number(transitions) > 0;
}

module.exports = { getExtrusionShiftWindow, getShiftDateForInstant, getShiftCodeForInstant, calculateShiftBalance, allocateVarianceByInput, addOperationalScrapInput, calculatePtiOutputEstimate, hasQualifyingShiftActivity };
