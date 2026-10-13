const labels: Record<string, string> = {
  technical: "technical", area: "area", workstations: "workstations", power: "power",
  connectivity: "connectivity", includedAccessories: "accessories", ventilation: "ventilation",
  lighting: "lighting", bandwidth: "bandwidth", channels: "channels", sampleRate: "sampleRate",
  display: "display", measurement: "measurement", resolution: "resolution", frameRate: "frameRate",
  outputVoltage: "outputVoltage", outputCurrent: "outputCurrent", protocols: "protocols",
  processor: "processor", memory: "memory", storage: "storage", magnification: "magnification",
  frequencyRange: "frequencyRange", waveforms: "waveforms", measurementRange: "measurementRange",
  accuracy: "accuracy", graphicsMemory: "graphicsMemory", technology: "technology", workArea: "workArea",
  materials: "materials", temperatureRange: "temperatureRange", contents: "contents",
  length: "length", diameter: "diameter", netWeight: "netWeight", material: "material",
  storageConditions: "storageConditions", suitableFor: "suitableFor",
};

export function resourceSpecLabel(key: string, tr: (key: string) => string) {
  return labels[key] ? tr(`ui.catalogue.spec.${labels[key]}`) : key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_.-]/g, " ");
}
