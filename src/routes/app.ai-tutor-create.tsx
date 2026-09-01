import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

import { subjects } from "@/data/subjects";
import { classLevels, languages } from "@/data/catalog";
import { createAILesson } from "@/lib/ai-tutor.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai-tutor-create")({
  head: () => ({
    meta: [
      {
        name: "description",
        content:
          "Upload a lesson and let AI automatically create an interactive tutoring experience.",
      },
      {
        property: "og:title",
        content: "Create AI Tutor Lesson — Vidya A.I.",
      },
      {
        property: "og:description",
        content:
          "Upload lessons for AI automatic processing and student tutoring.",
      },
    ],
  }),
  component: CreateAILessonPage,
});

function CreateAILessonPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classLevel: "",
    subjectId: "",
    chapter: "",
    topic: "",
    subtopic: "",
    teacherLanguage: "en",
    targetLanguages: ["en"],
    estimatedDurationMinutes: 20,
    difficulty: "intermediate",
    keywords: "",
    learningObjectives: "",
    pauseAfterEachTopic: true,
    numQuestionsPerTopic: 1,
  });

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const handleTargetLanguageToggle = useCallback((lang: string) => {
    setFormData((prev) => ({
      ...prev,
      targetLanguages: prev.targetLanguages.includes(lang)
        ? prev.targetLanguages.filter((l) => l !== lang)
        : [...prev.targetLanguages, lang],
    }));
  }, []);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        toast.error("Lesson title is required");
        return;
      }

      if (!formData.classLevel) {
        toast.error("Class level is required");
        return;
      }

      if (!formData.subjectId) {
        toast.error("Subject is required");
        return;
      }

      if (!formData.topic.trim()) {
        toast.error("Topic is required");
        return;
      }

      if (formData.targetLanguages.length === 0) {
        toast.error("Select at least one target language");
        return;
      }

      const result = await createAILesson({
  data: {
    title: formData.title.trim(),
    description: formData.description.trim(),
    classLevel: formData.classLevel,
    subjectId: formData.subjectId,
    chapter: formData.chapter.trim(),
    topic: formData.topic.trim(),
    subtopic: formData.subtopic.trim(),
    teacherLanguage: formData.teacherLanguage,
    targetLanguages: formData.targetLanguages,
    estimatedDurationMinutes:
      formData.estimatedDurationMinutes,
    difficulty: formData.difficulty as
      | "beginner"
      | "intermediate"
      | "advanced",
    keywords: formData.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    learningObjectives: formData.learningObjectives
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean),
    pauseAfterEachTopic:
      formData.pauseAfterEachTopic,
    numQuestionsPerTopic:
      formData.numQuestionsPerTopic,
    questionTypes: ["mcq"],
  },
});

      toast.success(
        "Lesson created! Now upload your media file.",
      );

      navigate({
        to: "/app/ai-tutor/$lessonId/upload",
        params: {
          lessonId: result.id,
        },
      });
    } catch (error) {
      console.error("Create AI lesson error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create lesson",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() =>
              navigate({
                to: "/app/dashboard",
              })
            }
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold">
              Create AI Tutor Lesson
            </h1>

            <p className="mt-1 text-muted-foreground">
              Upload your teaching material and AI will
              automatically create an interactive lesson.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl space-y-8"
        >
          {/* =====================================================
              LESSON BASICS
          ====================================================== */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Lesson Basics
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">
                  Lesson Title *
                </Label>

                <Input
                  id="title"
                  placeholder="e.g., Linear Equations in One Variable"
                  value={formData.title}
                  onChange={(e) =>
                    handleChange(
                      "title",
                      e.target.value,
                    )
                  }
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">
                  Description
                </Label>

                <Textarea
                  id="description"
                  placeholder="Brief overview of what students will learn"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    handleChange(
                      "description",
                      e.target.value,
                    )
                  }
                />
              </div>

              {/* Class + Subject */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CLASS LEVEL */}
                <div>
                  <Label htmlFor="classLevel">
                    Class Level *
                  </Label>

                  <select
                    id="classLevel"
                    value={formData.classLevel}
                    onChange={(e) =>
                      handleChange(
                        "classLevel",
                        e.target.value,
                      )
                    }
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">
                      Select class
                    </option>

                    {classLevels.map((level) => (
                      <option
                        key={level.id}
                        value={level.id}
                      >
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SUBJECT */}
                <div>
                  <Label htmlFor="subjectId">
                    Subject *
                  </Label>

                  <select
                    id="subjectId"
                    value={formData.subjectId}
                    onChange={(e) =>
                      handleChange(
                        "subjectId",
                        e.target.value,
                      )
                    }
                    required
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">
                      Select subject
                    </option>

                    {subjects.map((subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chapter + Topic */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="chapter">
                    Chapter (Optional)
                  </Label>

                  <Input
                    id="chapter"
                    placeholder="e.g., Algebra"
                    value={formData.chapter}
                    onChange={(e) =>
                      handleChange(
                        "chapter",
                        e.target.value,
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="topic">
                    Topic *
                  </Label>

                  <Input
                    id="topic"
                    placeholder="e.g., Linear Equations"
                    value={formData.topic}
                    onChange={(e) =>
                      handleChange(
                        "topic",
                        e.target.value,
                      )
                    }
                    required
                  />
                </div>
              </div>

              {/* Sub-topic */}
              <div>
                <Label htmlFor="subtopic">
                  Sub-topic (Optional)
                </Label>

                <Input
                  id="subtopic"
                  placeholder="e.g., Solving One-Step Equations"
                  value={formData.subtopic}
                  onChange={(e) =>
                    handleChange(
                      "subtopic",
                      e.target.value,
                    )
                  }
                />
              </div>
            </div>
          </Card>

          {/* =====================================================
              LANGUAGE SETTINGS
          ====================================================== */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Language Settings
            </h2>

            <div className="space-y-4">
              {/* Teacher Language */}
              <div>
                <Label htmlFor="teacherLanguage">
                  Your Teaching Language
                </Label>

                <Select
                  value={formData.teacherLanguage}
                  onValueChange={(value) =>
                    handleChange(
                      "teacherLanguage",
                      value,
                    )
                  }
                >
                  {languages.map((lang) => (
                    <option
                      key={lang.id}
                      value={lang.id}
                    >
                      {lang.label} ({lang.native})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Target Languages */}
              <div>
                <Label>
                  Target Student Languages *
                </Label>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  {languages.map((lang) => (
                    <label
                      key={lang.id}
                      className="flex cursor-pointer items-center gap-2 rounded border border-border p-2 hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={formData.targetLanguages.includes(
                          lang.id,
                        )}
                        onChange={() =>
                          handleTargetLanguageToggle(
                            lang.id,
                          )
                        }
                        className="rounded"
                      />

                      <span className="text-sm">
                        {lang.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* =====================================================
              CONTENT SETTINGS
          ====================================================== */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Content Settings
            </h2>

            <div className="space-y-4">
              {/* Difficulty + Duration */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="difficulty">
                    Difficulty Level
                  </Label>

                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) =>
                      handleChange(
                        "difficulty",
                        value,
                      )
                    }
                  >
                    <option value="beginner">
                      Beginner
                    </option>

                    <option value="intermediate">
                      Intermediate
                    </option>

                    <option value="advanced">
                      Advanced
                    </option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">
                    Estimated Duration (minutes)
                  </Label>

                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="480"
                    value={
                      formData.estimatedDurationMinutes
                    }
                    onChange={(e) => {
                      const value = Number(
                        e.target.value,
                      );

                      handleChange(
                        "estimatedDurationMinutes",
                        Number.isNaN(value)
                          ? 1
                          : value,
                      );
                    }}
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <Label htmlFor="keywords">
                  Keywords (comma-separated)
                </Label>

                <Textarea
                  id="keywords"
                  placeholder="equation, variable, solution, ..."
                  rows={2}
                  value={formData.keywords}
                  onChange={(e) =>
                    handleChange(
                      "keywords",
                      e.target.value,
                    )
                  }
                />
              </div>

              {/* Learning Objectives */}
              <div>
                <Label htmlFor="objectives">
                  Learning Objectives (one per line)
                </Label>

                <Textarea
                  id="objectives"
                  placeholder={`Student will be able to solve linear equations
Student will understand the concept of variables`}
                  rows={3}
                  value={
                    formData.learningObjectives
                  }
                  onChange={(e) =>
                    handleChange(
                      "learningObjectives",
                      e.target.value,
                    )
                  }
                />
              </div>

              {/* Questions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pauseTopics"
                    checked={
                      formData.pauseAfterEachTopic
                    }
                    onChange={(e) =>
                      handleChange(
                        "pauseAfterEachTopic",
                        e.target.checked,
                      )
                    }
                    className="rounded"
                  />

                  <Label
                    htmlFor="pauseTopics"
                    className="mb-0"
                  >
                    Pause after each topic for
                    questions
                  </Label>
                </div>

                {formData.pauseAfterEachTopic && (
                  <div>
                    <Label htmlFor="numQuestions">
                      Questions per topic
                    </Label>

                    <Select
                      value={formData.numQuestionsPerTopic.toString()}
                      onValueChange={(value) =>
                        handleChange(
                          "numQuestionsPerTopic",
                          Number(value),
                        )
                      }
                    >
                      {[1, 2, 3, 4, 5].map(
                        (n) => (
                          <option
                            key={n}
                            value={n}
                          >
                            {n} question
                            {n > 1 ? "s" : ""}
                          </option>
                        ),
                      )}
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* =====================================================
              SUBMIT
          ====================================================== */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
            >
              {loading && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {loading
                ? "Creating..."
                : "Create Lesson & Upload Media"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate({
                  to: "/app/dashboard",
                })
              }
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </AppShell>
  );
}