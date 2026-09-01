/**
 * AI Tutor lesson management API
 * Handles lesson creation, metadata updates, and file uploads.
 *
 * NOTE:
 * Auth is currently stubbed. In production, replace
 * getMockUserId() with proper authenticated user/session handling.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

/* =========================================================
   VALIDATION SCHEMAS
   ========================================================= */

const CreateLessonInput = z.object({
  title: z.string().min(1).max(200),

  description: z.string().max(1000).optional(),

  classLevel: z.string().min(1),

  subjectId: z.string().min(1),

  chapter: z.string().max(200).optional(),

  topic: z.string().min(1).max(200),

  subtopic: z.string().max(200).optional(),

  teacherLanguage: z
    .string()
    .min(2)
    .max(5)
    .default("en"),

  targetLanguages: z
    .array(z.string().min(2).max(5))
    .min(1)
    .default(["en"]),

  estimatedDurationMinutes: z
    .number()
    .int()
    .min(1)
    .max(480)
    .optional(),

  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("intermediate"),

  prerequisites: z.array(z.string()).optional(),

  keywords: z.array(z.string()).optional(),

  learningObjectives: z.array(z.string()).optional(),

  pauseAfterEachTopic: z
    .boolean()
    .default(true),

  numQuestionsPerTopic: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(1),

  questionTypes: z
    .array(
      z.enum([
        "mcq",
        "true_false",
        "fill_blank",
        "short_answer",
      ]),
    )
    .min(1)
    .default(["mcq"]),
});

const UpdateLessonInput =
  CreateLessonInput.partial().extend({
    lessonId: z.string().uuid(),
  });

const PublishLessonInput = z.object({
  lessonId: z.string().uuid(),
  publish: z.boolean(),
});

const GetLessonInput = z.object({
  lessonId: z.string().uuid(),
});

/* =========================================================
   AUTH HELPER
   ========================================================= */

/**
 * Temporary authentication helper.
 *
 * This UUID is the existing teacher/user UUID
 * from the Supabase database.
 *
 * Replace this with real Supabase authentication
 * before production deployment.
 */
function getMockUserId(): string {
  return "d0a44db2-5d11-43bf-ada6-2d40d1416b11";
}

/* =========================================================
   CREATE AI LESSON
   ========================================================= */

export const createAILesson = createServerFn({
  method: "POST",
})
  .inputValidator((input: unknown) =>
    CreateLessonInput.parse(input),
  )
  .handler(async ({ data }) => {
    const userId = getMockUserId();

    const {
      data: lesson,
      error,
    } = await supabaseAdmin
      .from("ai_lessons")
      .insert({
  teacher_id: userId,

  title: data.title,
  description: data.description ?? null,

  class_level: data.classLevel,
  subject_id: data.subjectId,

  chapter: data.chapter ?? null,
  topic: data.topic,
  subtopic: data.subtopic ?? null,

  teacher_language: data.teacherLanguage,
  target_languages: data.targetLanguages,

  estimated_duration_minutes:
    data.estimatedDurationMinutes ?? null,

  difficulty: data.difficulty,

  prerequisites: data.prerequisites ?? null,
  keywords: data.keywords ?? null,
  learning_objectives: data.learningObjectives ?? null,

  pause_after_each_topic:
    data.pauseAfterEachTopic,

  num_questions_per_topic:
    data.numQuestionsPerTopic,

  question_types: data.questionTypes,

  status: "uploaded",
})
      .select()
      .single();

    if (error) {
      throw new Error(
        `Failed to create lesson: ${error.message}`,
      );
    }

    if (!lesson) {
      throw new Error(
        "Lesson was not created.",
      );
    }

    return lesson;
  });

/* =========================================================
   GET AI LESSON
   ========================================================= */

export const getAILesson = createServerFn({
  method: "POST",
})
  .inputValidator((input: unknown) =>
    GetLessonInput.parse(input),
  )
  .handler(async ({ data }) => {
    const userId = getMockUserId();

    const {
      data: lesson,
      error,
    } = await supabaseAdmin
      .from("ai_lessons")
      .select("*")
      .eq("id", data.lessonId)
      .single();

    if (error) {
      throw new Error(
        `Lesson not found: ${error.message}`,
      );
    }

    if (!lesson) {
      throw new Error(
        "Lesson not found.",
      );
    }

    /*
     * Verify access:
     * - Teacher can see their own lesson.
     * - Others can see published lessons.
     */
    if (
      lesson.teacher_id !== userId &&
      !lesson.published
    ) {
      throw new Error(
        "Unauthorized: You do not have access to this lesson",
      );
    }

    return lesson;
  });

/* =========================================================
   LIST TEACHER LESSONS
   ========================================================= */

export const listMyAILessons =
  createServerFn({
    method: "POST",
  }).handler(async () => {
    const userId = getMockUserId();

    const {
      data: lessons,
      error,
    } = await supabaseAdmin
      .from("ai_lessons")
      .select("*")
      .eq("teacher_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(
        `Failed to fetch lessons: ${error.message}`,
      );
    }

    return lessons ?? [];
  });

/* =========================================================
   LIST PUBLISHED LESSONS
   ========================================================= */

export const listPublishedAILessons =
  createServerFn({
    method: "POST",
  })
    .inputValidator((input: unknown) =>
      z
        .object({
          classLevel: z.string().optional(),
          subjectId: z.string().optional(),
          targetLanguage: z.string().optional(),
        })
        .parse(input),
    )
    .handler(async ({ data }) => {
      let query = supabaseAdmin
        .from("ai_lessons")
        .select("*")
        .eq("published", true)
        .eq("status", "ready");

      if (data.classLevel) {
        query = query.eq(
          "class_level",
          data.classLevel,
        );
      }

      if (data.subjectId) {
        query = query.eq(
          "subject_id",
          data.subjectId,
        );
      }

      if (data.targetLanguage) {
        query = query.contains(
          "target_languages",
          [data.targetLanguage],
        );
      }

      const {
        data: lessons,
        error,
      } = await query.order(
        "created_at",
        {
          ascending: false,
        },
      );

      if (error) {
        throw new Error(
          `Failed to fetch lessons: ${error.message}`,
        );
      }

      return lessons ?? [];
    });

/* =========================================================
   UPDATE AI LESSON
   ========================================================= */

export const updateAILesson =
  createServerFn({
    method: "POST",
  })
    .inputValidator((input: unknown) =>
      UpdateLessonInput.parse(input),
    )
    .handler(async ({ data }) => {
      const userId = getMockUserId();

      /* -----------------------------------------
         Verify ownership
         ----------------------------------------- */

      const {
        data: lesson,
        error: fetchError,
      } = await supabaseAdmin
        .from("ai_lessons")
        .select("teacher_id, status")
        .eq("id", data.lessonId)
        .single();

      if (
        fetchError ||
        !lesson
      ) {
        throw new Error(
          "Lesson not found",
        );
      }

      if (
        lesson.teacher_id !== userId
      ) {
        throw new Error(
          "Unauthorized",
        );
      }

      if (
        lesson.status !== "uploaded"
      ) {
        throw new Error(
          "Cannot update lesson metadata after processing has started",
        );
      }

      /* -----------------------------------------
         Build update object
         ----------------------------------------- */

      const updateData: Database["public"]["Tables"]["ai_lessons"]["Update"] = {};
      if (data.title !== undefined) {
        updateData.title =
          data.title;
      }

      if (
        data.description !==
        undefined
      ) {
        updateData.description =
          data.description;
      }

      if (
        data.classLevel !==
        undefined
      ) {
        updateData.class_level =
          data.classLevel;
      }

      if (
        data.subjectId !==
        undefined
      ) {
        updateData.subject_id =
          data.subjectId;
      }

      if (
        data.chapter !==
        undefined
      ) {
        updateData.chapter =
          data.chapter;
      }

      if (
        data.topic !==
        undefined
      ) {
        updateData.topic =
          data.topic;
      }

      if (
        data.subtopic !==
        undefined
      ) {
        updateData.subtopic =
          data.subtopic;
      }

      if (
        data.teacherLanguage !==
        undefined
      ) {
        updateData.teacher_language =
          data.teacherLanguage;
      }

      if (
        data.targetLanguages !==
        undefined
      ) {
        updateData.target_languages =
          data.targetLanguages;
      }

      if (
        data.estimatedDurationMinutes !==
        undefined
      ) {
        updateData.estimated_duration_minutes =
          data.estimatedDurationMinutes;
      }

      if (
        data.difficulty !==
        undefined
      ) {
        updateData.difficulty =
          data.difficulty;
      }

      if (
        data.prerequisites !==
        undefined
      ) {
        updateData.prerequisites =
          data.prerequisites;
      }

      if (
        data.keywords !==
        undefined
      ) {
        updateData.keywords =
          data.keywords;
      }

      if (
        data.learningObjectives !==
        undefined
      ) {
        updateData.learning_objectives =
          data.learningObjectives;
      }

      if (
        data.pauseAfterEachTopic !==
        undefined
      ) {
        updateData.pause_after_each_topic =
          data.pauseAfterEachTopic;
      }

      if (
        data.numQuestionsPerTopic !==
        undefined
      ) {
        updateData.num_questions_per_topic =
          data.numQuestionsPerTopic;
      }

      if (
        data.questionTypes !==
        undefined
      ) {
        updateData.question_types =
          data.questionTypes;
      }

      updateData.updated_at =
        new Date().toISOString();

      /* -----------------------------------------
         Update database
         ----------------------------------------- */

      const {
        data: updated,
        error: updateError,
      } = await supabaseAdmin
        .from("ai_lessons")
        .update(updateData)
        .eq("id", data.lessonId)
        .select()
        .single();

      if (updateError) {
        throw new Error(
          `Failed to update lesson: ${updateError.message}`,
        );
      }

      return updated;
    });

/* =========================================================
   PUBLISH / UNPUBLISH AI LESSON
   ========================================================= */

export const publishAILesson =
  createServerFn({
    method: "POST",
  })
    .inputValidator((input: unknown) =>
      PublishLessonInput.parse(input),
    )
    .handler(async ({ data }) => {
      const userId = getMockUserId();

      /* -----------------------------------------
         Verify ownership
         ----------------------------------------- */

      const {
        data: lesson,
        error: fetchError,
      } = await supabaseAdmin
        .from("ai_lessons")
        .select(
          "teacher_id, status",
        )
        .eq("id", data.lessonId)
        .single();

      if (
        fetchError ||
        !lesson
      ) {
        throw new Error(
          "Lesson not found",
        );
      }

      if (
        lesson.teacher_id !== userId
      ) {
        throw new Error(
          "Unauthorized",
        );
      }

      /* -----------------------------------------
         Publishing requires ready status
         ----------------------------------------- */

      if (
        data.publish &&
        lesson.status !== "ready"
      ) {
        throw new Error(
          `Cannot publish lesson. Current status: ${lesson.status}. Lesson must be "ready" to publish.`,
        );
      }

      /* -----------------------------------------
         Update published state
         ----------------------------------------- */

      const {
        data: updated,
        error,
      } = await supabaseAdmin
        .from("ai_lessons")
        .update({
          published:
            data.publish,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          data.lessonId,
        )
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to publish lesson: ${error.message}`,
        );
      }

      return updated;
    });

/* =========================================================
   DELETE AI LESSON
   ========================================================= */

export const deleteAILesson =
  createServerFn({
    method: "POST",
  })
    .inputValidator((input: unknown) =>
      GetLessonInput.parse(input),
    )
    .handler(async ({ data }) => {
      const userId = getMockUserId();

      /* -----------------------------------------
         Verify ownership
         ----------------------------------------- */

      const {
        data: lesson,
        error: fetchError,
      } = await supabaseAdmin
        .from("ai_lessons")
        .select(
          "teacher_id, status",
        )
        .eq("id", data.lessonId)
        .single();

      if (
        fetchError ||
        !lesson
      ) {
        throw new Error(
          "Lesson not found",
        );
      }

      if (
        lesson.teacher_id !== userId
      ) {
        throw new Error(
          "Unauthorized",
        );
      }

      if (
        lesson.status !==
        "uploaded"
      ) {
        throw new Error(
          "Cannot delete lesson after processing has started",
        );
      }

      /* -----------------------------------------
         Delete lesson
         ----------------------------------------- */

      const { error } =
        await supabaseAdmin
          .from("ai_lessons")
          .delete()
          .eq(
            "id",
            data.lessonId,
          );

      if (error) {
        throw new Error(
          `Failed to delete lesson: ${error.message}`,
        );
      }

      return {
        success: true,
      };
    });