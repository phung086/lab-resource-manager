// Deterministic teaching scenario, not a calibrated thermal model or hardware measurement.
export function scenarioSample(step) {
  if (!Number.isInteger(step) || step < 0 || step >= 60) throw new RangeError('Step must be 0..59');
  const wave = Math.sin(step * 0.7);
  if (step < 12) return {phase:'NORMAL',online:true,temperatureC:42+wave,cpuPercent:20+wave*3,ramPercent:32};
  if (step < 24) return {phase:'LOAD',online:true,temperatureC:52+(step-12)*2.4,cpuPercent:93+wave*2,ramPercent:65};
  if (step < 36) return {phase:'OVERHEAT',online:true,temperatureC:91+wave,cpuPercent:96,ramPercent:78};
  if (step < 42) return {phase:'OFFLINE',online:false};
  return {phase:'RECOVERY',online:true,temperatureC:Math.max(44,72-(step-42)*2),cpuPercent:25+wave*2,ramPercent:35};
}
