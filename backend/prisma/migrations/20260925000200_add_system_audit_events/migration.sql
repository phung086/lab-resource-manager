-- CreateTable
CREATE TABLE public.system_audit_events (
    id text NOT NULL,
    actor_id text,
    actor_role_snapshot public."Role",
    action character varying(64) NOT NULL,
    target_type character varying(64) NOT NULL,
    target_id text NOT NULL,
    lab_id text,
    resource_id text,
    before_state jsonb,
    after_state jsonb,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz(6) NOT NULL DEFAULT now(),

    CONSTRAINT system_audit_events_pkey PRIMARY KEY (id)
);

-- CreateIndex
CREATE INDEX system_audit_events_created_at_idx ON public.system_audit_events(created_at);

-- CreateIndex
CREATE INDEX system_audit_events_actor_id_created_at_idx ON public.system_audit_events(actor_id, created_at);

-- CreateIndex
CREATE INDEX system_audit_events_target_type_target_id_created_at_idx ON public.system_audit_events(target_type, target_id, created_at);

-- CreateIndex
CREATE INDEX system_audit_events_lab_id_created_at_idx ON public.system_audit_events(lab_id, created_at);

-- AddForeignKey
ALTER TABLE public.system_audit_events ADD CONSTRAINT system_audit_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public.system_audit_events ADD CONSTRAINT system_audit_events_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.laboratories(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE public.system_audit_events ADD CONSTRAINT system_audit_events_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE SET NULL ON UPDATE CASCADE;
