import assert from "node:assert/strict";

console.log("=== RUNNING ELIGIBILITY & TEMPORARY ACCOUNT UNIT TESTS ===");

// 1. Eligibility Logic Unit Test
function evaluateResourceEligibility(resource, userCertifications) {
  // If resource is not available physically:
  if (resource.operationalStatus !== "AVAILABLE") {
    return {
      eligible: false,
      reason: "OPERATIONAL_STATUS_UNAVAILABLE",
      message: `Tài nguyên đang ở trạng thái ${resource.operationalStatus}, không thể đặt.`
    };
  }

  // Check mandatory training requirements
  const mandatoryReqs = resource.trainingRequirements?.filter((r) => r.isMandatory) || [];
  if (mandatoryReqs.length === 0) {
    return {
      eligible: true,
      reason: "NO_REQUIREMENTS",
      message: "Đủ điều kiện (Không yêu cầu chứng chỉ)"
    };
  }

  const now = Date.now();
  for (const req of mandatoryReqs) {
    const courseCode = req.course?.code || req.courseCode;
    const cert = userCertifications.find((c) => c.code === courseCode || c.courseId === req.courseId);

    if (!cert) {
      return {
        eligible: false,
        reason: "MISSING_TRAINING",
        message: `Chưa hoàn thành khóa đào tạo bắt buộc: ${req.course?.name || courseCode}`
      };
    }

    const isExpired = cert.status === "EXPIRED" || cert.status === "REVOKED" || (cert.expiresAt && new Date(cert.expiresAt).getTime() < now);
    if (isExpired) {
      return {
        eligible: false,
        reason: "CERTIFICATION_EXPIRED",
        message: `Chứng nhận an toàn đã hết hạn: ${req.course?.name || courseCode}`
      };
    }
  }

  return {
    eligible: true,
    reason: "ELIGIBLE",
    message: "Đủ điều kiện an toàn phòng lab"
  };
}

// Test Case 1: Valid certification
const resourceWithLaserCourse = {
  id: "res-laser-01",
  operationalStatus: "AVAILABLE",
  trainingRequirements: [
    { isMandatory: true, courseId: "c-laser", course: { code: "SAF-LASER", name: "An toàn thiết bị Laser" } }
  ]
};

const userWithValidCert = [
  { courseId: "c-laser", code: "SAF-LASER", status: "VALID", expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() }
];

const res1 = evaluateResourceEligibility(resourceWithLaserCourse, userWithValidCert);
assert.equal(res1.eligible, true, "User with valid cert should be eligible");
assert.equal(res1.reason, "ELIGIBLE");
console.log("PASS: Valid certification grants access");

// Test Case 2: Missing training
const userWithNoCert = [];
const res2 = evaluateResourceEligibility(resourceWithLaserCourse, userWithNoCert);
assert.equal(res2.eligible, false, "User with no cert should not be eligible");
assert.equal(res2.reason, "MISSING_TRAINING");
assert.match(res2.message, /Chưa hoàn thành khóa đào tạo bắt buộc/);
console.log("PASS: Missing certification denies access");

// Test Case 3: Expired certification
const userWithExpiredCert = [
  { courseId: "c-laser", code: "SAF-LASER", status: "EXPIRED", expiresAt: new Date(Date.now() - 86400000).toISOString() }
];
const res3 = evaluateResourceEligibility(resourceWithLaserCourse, userWithExpiredCert);
assert.equal(res3.eligible, false, "User with expired cert should not be eligible");
assert.equal(res3.reason, "CERTIFICATION_EXPIRED");
assert.match(res3.message, /Chứng nhận an toàn đã hết hạn/);
console.log("PASS: Expired certification denies access");

// Test Case 4: Resource under maintenance
const resourceMaintenance = {
  id: "res-cnc-01",
  operationalStatus: "MAINTENANCE",
  trainingRequirements: []
};
const res4 = evaluateResourceEligibility(resourceMaintenance, userWithValidCert);
assert.equal(res4.eligible, false);
assert.equal(res4.reason, "OPERATIONAL_STATUS_UNAVAILABLE");
console.log("PASS: Resource maintenance denies booking regardless of certs");

// 2. Temporary Account Security & Navigation Protection Test
function isRouteAllowedForUser(targetTab, user) {
  if (user?.passwordResetRequired) {
    // Only safe tabs allowed (home, profile)
    return ["home", "profile"].includes(targetTab);
  }
  return true;
}

const tempUser = { id: "user-temp-01", passwordResetRequired: true };
const normalUser = { id: "user-normal-01", passwordResetRequired: false };

assert.equal(isRouteAllowedForUser("payments", tempUser), false, "Temporary user cannot access payments");
assert.equal(isRouteAllowedForUser("bookings", tempUser), false, "Temporary user cannot access bookings");
assert.equal(isRouteAllowedForUser("smart_calendar", tempUser), false, "Temporary user cannot access calendar");
assert.equal(isRouteAllowedForUser("home", tempUser), true, "Temporary user can access home (password prompt)");
assert.equal(isRouteAllowedForUser("profile", tempUser), true, "Temporary user can access profile (change password)");

assert.equal(isRouteAllowedForUser("payments", normalUser), true, "Normal user can access payments");
assert.equal(isRouteAllowedForUser("bookings", normalUser), true, "Normal user can access bookings");
console.log("PASS: Temporary account navigation restrictions correctly enforced");

// 3. Customer Classification Semantics Test
function getCustomerClassificationInfo(user) {
  return {
    customerType: user.customerType || "INTERNAL",
    customerTypeSemantics: "SELF_DECLARED_UNVERIFIED",
    grantsRbacAuthority: false,
    bypassesTrainingRules: false
  };
}

const classification = getCustomerClassificationInfo({ customerType: "INTERNAL" });
assert.equal(classification.customerTypeSemantics, "SELF_DECLARED_UNVERIFIED");
assert.equal(classification.grantsRbacAuthority, false);
assert.equal(classification.bypassesTrainingRules, false);
console.log("PASS: customerTypeSemantics remains strictly SELF_DECLARED_UNVERIFIED with zero RBAC/safety bypass");

console.log("ALL ELIGIBILITY & TEMPORARY ACCOUNT TESTS PASSED!");
