-- CreateTable ResourceRequirement
CREATE TABLE "resource_requirements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "resourceType" "ResourceType" NOT NULL DEFAULT 'gpu_server',
    "minVramGb" INTEGER DEFAULT 16,
    "minComputeTflops" DOUBLE PRECISION,
    "requiredCapabilities" JSONB NOT NULL DEFAULT '{}',
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "deadline" TIMESTAMP(3),
    "maxCostVnd" DOUBLE PRECISION,
    "priorityScore" INTEGER NOT NULL DEFAULT 50,
    "projectUrgency" TEXT NOT NULL DEFAULT 'course_project',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable ResourceAllocation
CREATE TABLE "resource_allocations" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT,
    "bookingId" TEXT,
    "resourceId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allocationStatus" TEXT NOT NULL DEFAULT 'proposed',
    "optimizationRunId" TEXT,
    "totalScore" DOUBLE PRECISION DEFAULT 0,
    "energyScore" DOUBLE PRECISION DEFAULT 0,
    "fairnessScore" DOUBLE PRECISION DEFAULT 0,
    "healthScore" DOUBLE PRECISION DEFAULT 0,
    "explanation" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable PolicyVersion
CREATE TABLE "policy_versions" (
    "id" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '2026.1',
    "name" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable OptimizationRun
CREATE TABLE "optimization_runs" (
    "id" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL DEFAULT '1.0',
    "datasetVersion" TEXT,
    "policyVersionId" TEXT,
    "populationSize" INTEGER,
    "generations" INTEGER,
    "mutationRate" DOUBLE PRECISION,
    "crossoverRate" DOUBLE PRECISION,
    "objectiveWeights" JSONB NOT NULL DEFAULT '{}',
    "metricsSummary" JSONB NOT NULL DEFAULT '{}',
    "runtimeMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimization_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable OptimizationDecision
CREATE TABLE "optimization_decisions" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "allocationId" TEXT,
    "objectiveVector" JSONB NOT NULL DEFAULT '[]',
    "paretoRank" INTEGER NOT NULL DEFAULT 1,
    "crowdingDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimization_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "resource_requirements_userId_idx" ON "resource_requirements"("userId");
CREATE INDEX "resource_requirements_bookingId_idx" ON "resource_requirements"("bookingId");

CREATE INDEX "resource_allocations_resourceId_startAt_endAt_idx" ON "resource_allocations"("resourceId", "startAt", "endAt");
CREATE INDEX "resource_allocations_requirementId_idx" ON "resource_allocations"("requirementId");
CREATE INDEX "resource_allocations_bookingId_idx" ON "resource_allocations"("bookingId");
CREATE INDEX "resource_allocations_optimizationRunId_idx" ON "resource_allocations"("optimizationRunId");

CREATE INDEX "policy_versions_policyType_isActive_idx" ON "policy_versions"("policyType", "isActive");

CREATE INDEX "optimization_runs_algorithm_idx" ON "optimization_runs"("algorithm");
CREATE INDEX "optimization_runs_policyVersionId_idx" ON "optimization_runs"("policyVersionId");

CREATE INDEX "optimization_decisions_runId_idx" ON "optimization_decisions"("runId");

-- AddForeignKeys
ALTER TABLE "resource_requirements" ADD CONSTRAINT "resource_requirements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_requirements" ADD CONSTRAINT "resource_requirements_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "resource_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES "optimization_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "policy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "optimization_decisions" ADD CONSTRAINT "optimization_decisions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "optimization_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
