import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UploadMediaInput = z.object({
  lessonId: z.string().uuid(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  fileBase64: z.string().min(1),
});

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "mp4" : "mp4";
}

export const uploadAILessonMedia = createServerFn({
  method: "POST",
})
  .inputValidator((input: unknown) =>
    UploadMediaInput.parse(input),
  )
  .handler(async ({ data }) => {
    const allowedMimeTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!allowedMimeTypes.includes(data.mimeType)) {
      throw new Error(
        "Unsupported video format. Please upload MP4, WebM, or MOV.",
      );
    }

    const MAX_FILE_SIZE = 500 * 1024 * 1024;

    if (data.fileSizeBytes > MAX_FILE_SIZE) {
      throw new Error(
        "Video is too large. Maximum allowed size is 500 MB.",
      );
    }

    const { data: lesson, error: lessonError } =
      await supabaseAdmin
        .from("ai_lessons")
        .select("id, teacher_id, status")
        .eq("id", data.lessonId)
        .single();

    if (lessonError || !lesson) {
      throw new Error("AI lesson not found.");
    }

    const extension = getFileExtension(data.fileName);

    const storagePath =
      `ai-tutor/${lesson.id}/original/teacher-video-${crypto.randomUUID()}.${extension}`;

    const binaryString = Buffer.from(data.fileBase64, "base64");

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from("ai-tutor-lessons")
        .upload(storagePath, binaryString, {
          contentType: data.mimeType,
          upsert: false,
        });

    if (uploadError) {
      throw new Error(
        `Failed to upload video: ${uploadError.message}`,
      );
    }

    const { data: media, error: mediaError } =
      await supabaseAdmin
        .from("ai_lesson_media")
        .insert({
          lesson_id: lesson.id,
          media_type: "video",
          storage_path: storagePath,
          mime_type: data.mimeType,
          file_size_bytes: data.fileSizeBytes,
          processing_status: "uploaded",
        })
        .select()
        .single();

    if (mediaError) {
      await supabaseAdmin.storage
        .from("ai-tutor-lessons")
        .remove([storagePath]);

      throw new Error(
        `Failed to create media record: ${mediaError.message}`,
      );
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("ai_lessons")
        .update({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lesson.id);

    if (updateError) {
      throw new Error(
        `Video uploaded but lesson status could not be updated: ${updateError.message}`,
      );
    }

    return {
      success: true,
      lessonId: lesson.id,
      mediaId: media.id,
      storagePath,
      processingStatus: media.processing_status,
    };
  });