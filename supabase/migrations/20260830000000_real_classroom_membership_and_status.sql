ALTER TABLE public.live_classes
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended'));

CREATE TABLE IF NOT EXISTS public.classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_members TO authenticated;
GRANT ALL ON public.classroom_members TO service_role;

ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read classes" ON public.live_classes;
DROP POLICY IF EXISTS "Anyone can create classes" ON public.live_classes;
DROP POLICY IF EXISTS "Anyone can update class live state" ON public.live_classes;
DROP POLICY IF EXISTS "Anyone can read class messages" ON public.live_messages;
DROP POLICY IF EXISTS "Anyone can post class messages" ON public.live_messages;

CREATE POLICY "Teachers can view own classrooms"
ON public.live_classes
FOR SELECT
TO authenticated
USING (
  auth.uid() = teacher_id
  OR EXISTS (
    SELECT 1
    FROM public.classroom_members cm
    WHERE cm.classroom_id = live_classes.id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can create their own classrooms"
ON public.live_classes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own classrooms"
ON public.live_classes
FOR UPDATE
TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can read joined classrooms"
ON public.live_classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.classroom_members cm
    WHERE cm.classroom_id = live_classes.id
      AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Teachers can view classroom members"
ON public.classroom_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.live_classes lc
    WHERE lc.id = classroom_id
      AND lc.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view own membership"
ON public.classroom_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Students can join active classrooms"
ON public.classroom_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.live_classes lc
    WHERE lc.id = classroom_id
      AND lc.status IN ('scheduled', 'live')
      AND lc.teacher_id IS NOT NULL
  )
);

CREATE POLICY "Students can leave their own memberships"
ON public.classroom_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Teachers can manage their classroom memberships"
ON public.classroom_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.live_classes lc
    WHERE lc.id = classroom_id
      AND lc.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can read messages for their classrooms"
ON public.live_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.live_classes lc
    WHERE lc.id = class_id
      AND (
        lc.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.classroom_members cm
          WHERE cm.classroom_id = lc.id
            AND cm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Teachers can post class messages"
ON public.live_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.live_classes lc
    WHERE lc.id = class_id
      AND lc.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can read joined class messages"
ON public.live_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.classroom_members cm
    WHERE cm.classroom_id = class_id
      AND cm.user_id = auth.uid()
  )
);

ALTER TABLE public.live_messages REPLICA IDENTITY FULL;
ALTER TABLE public.live_classes REPLICA IDENTITY FULL;
ALTER TABLE public.classroom_members REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.classroom_members;
