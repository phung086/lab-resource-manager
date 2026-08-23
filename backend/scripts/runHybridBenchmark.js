import { benchmarkFastPathAllocation } from "../src/services/hybridDispatchService.js";

const sampleResources = [
  { id: "res-1", code: "GPU-H100-01", name: "GPU H100 Node 1", specs: { vramGb: 80 }, operationalStatus: "available" },
  { id: "res-2", code: "GPU-H100-02", name: "GPU H100 Node 2", specs: { vramGb: 80 }, operationalStatus: "available" },
  { id: "res-3", code: "GPU-L40S-01", name: "GPU L40S Node 1", specs: { vramGb: 48 }, operationalStatus: "available" },
  { id: "res-4", code: "GPU-L40S-02", name: "GPU L40S Node 2", specs: { vramGb: 48 }, operationalStatus: "available" },
  { id: "res-5", code: "UAV-JETSON-01", name: "Jetson Orin UAV", specs: { vramGb: 16 }, operationalStatus: "available" }
];

const existingBookings = [
  { id: "b-1", resourceId: "res-1", startHour: 8, endHour: 10, status: "approved" },
  { id: "b-2", resourceId: "res-2", startHour: 9, endHour: 11, status: "approved" },
  { id: "b-3", resourceId: "res-3", startHour: 13, endHour: 16, status: "approved" }
];

const sampleRequests = [
  { id: "REQ-URG-01", durationHours: 2, preferredStartHour: 8, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-02", durationHours: 3, preferredStartHour: 9, minVramGb: 48, userRole: "master_student", projectUrgency: "thesis_defense" },
  { id: "REQ-URG-03", durationHours: 1, preferredStartHour: 10, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-04", durationHours: 2, preferredStartHour: 14, minVramGb: 48, userRole: "undergrad_student", projectUrgency: "course_project" },
  { id: "REQ-URG-05", durationHours: 4, preferredStartHour: 8, minVramGb: 16, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-06", durationHours: 2, preferredStartHour: 11, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-07", durationHours: 2, preferredStartHour: 13, minVramGb: 48, userRole: "master_student", projectUrgency: "thesis_defense" },
  { id: "REQ-URG-08", durationHours: 1, preferredStartHour: 15, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-09", durationHours: 3, preferredStartHour: 8, minVramGb: 48, userRole: "undergrad_student", projectUrgency: "course_project" },
  { id: "REQ-URG-10", durationHours: 2, preferredStartHour: 16, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-11", durationHours: 2, preferredStartHour: 9, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-12", durationHours: 1, preferredStartHour: 10, minVramGb: 48, userRole: "master_student", projectUrgency: "thesis_defense" },
  { id: "REQ-URG-13", durationHours: 2, preferredStartHour: 11, minVramGb: 48, userRole: "undergrad_student", projectUrgency: "course_project" },
  { id: "REQ-URG-14", durationHours: 4, preferredStartHour: 13, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-15", durationHours: 2, preferredStartHour: 15, minVramGb: 16, userRole: "master_student", projectUrgency: "thesis_defense" },
  { id: "REQ-URG-16", durationHours: 1, preferredStartHour: 8, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-17", durationHours: 2, preferredStartHour: 10, minVramGb: 48, userRole: "undergrad_student", projectUrgency: "course_project" },
  { id: "REQ-URG-18", durationHours: 3, preferredStartHour: 12, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-19", durationHours: 2, preferredStartHour: 14, minVramGb: 48, userRole: "master_student", projectUrgency: "thesis_defense" },
  { id: "REQ-URG-20", durationHours: 1, preferredStartHour: 16, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-21", durationHours: 2, preferredStartHour: 17, minVramGb: 48, userRole: "undergrad_student", projectUrgency: "course_project" },
  { id: "REQ-URG-22", durationHours: 2, preferredStartHour: 8, minVramGb: 48, userRole: "master_student", projectUrgency: "thesis_defense" },
  { id: "REQ-URG-23", durationHours: 3, preferredStartHour: 11, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" },
  { id: "REQ-URG-24", durationHours: 1, preferredStartHour: 15, minVramGb: 48, userRole: "undergrad_student", projectUrgency: "course_project" },
  { id: "REQ-URG-25", durationHours: 2, preferredStartHour: 18, minVramGb: 80, userRole: "phd_researcher", projectUrgency: "paper_deadline" }
];

const result = benchmarkFastPathAllocation(sampleRequests, sampleResources, existingBookings);
console.log(JSON.stringify(result, null, 2));
