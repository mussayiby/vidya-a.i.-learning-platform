export type CompletionEvent = {
  lessonId: string;
  completedAt: string;
  durationMinutes: number;
};

const COMPLETION_EVENTS_KEY = "vidya.completionEvents";

const DAY_NAMES: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()] ?? "Unknown";
}

/**
 * Check whether a value is a valid CompletionEvent.
 */
function isCompletionEvent(
  value: unknown,
): value is CompletionEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Record<string, unknown>;

  return (
    typeof event["lessonId"] === "string" &&
    typeof event["completedAt"] === "string" &&
    typeof event["durationMinutes"] === "number"
  );
}

/**
 * Get completion events stored for a user.
 */
function getCompletionEvents(
  userId: string,
): CompletionEvent[] {
  if (
    typeof window === "undefined" ||
    !userId
  ) {
    return [];
  }

  try {
    const key = `${COMPLETION_EVENTS_KEY}.${userId}`;
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCompletionEvent);
  } catch {
    return [];
  }
}

/**
 * Save completion events for a user.
 */
function saveCompletionEvents(
  userId: string,
  events: CompletionEvent[],
): void {
  if (
    typeof window === "undefined" ||
    !userId
  ) {
    return;
  }

  try {
    const key = `${COMPLETION_EVENTS_KEY}.${userId}`;

    window.localStorage.setItem(
      key,
      JSON.stringify(events),
    );
  } catch {
    // Ignore localStorage errors.
  }
}

export const dashboardAnalyticsService = {
  /**
   * Record a lesson completion.
   */
  recordCompletion(
    userId: string,
    lessonId: string,
    durationMinutes: number,
  ): void {
    if (!userId || !lessonId) {
      return;
    }

    const events =
      getCompletionEvents(userId);

    const existing = events.find(
      (event) =>
        event.lessonId === lessonId,
    );

    if (existing) {
      return;
    }

    const safeDuration =
      Number.isFinite(durationMinutes) &&
      durationMinutes >= 0
        ? durationMinutes
        : 0;

    events.push({
      lessonId,
      completedAt:
        new Date().toISOString(),
      durationMinutes: safeDuration,
    });

    saveCompletionEvents(
      userId,
      events,
    );
  },

  /**
   * Get all completion events.
   * Most recent first.
   */
  getCompletionEvents(
    userId: string,
  ): CompletionEvent[] {
    const events =
      getCompletionEvents(userId);

    return [...events].sort(
      (a, b) =>
        new Date(
          b.completedAt,
        ).getTime() -
        new Date(
          a.completedAt,
        ).getTime(),
    );
  },

  /**
   * Calculate the current consecutive-day streak.
   */
  getCurrentStreak(
    userId: string,
  ): number {
    const events =
      getCompletionEvents(userId);

    if (events.length === 0) {
      return 0;
    }

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0,
    );

    const eventDates =
      new Set<string>();

    events.forEach((event) => {
      const date =
        new Date(event.completedAt);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return;
      }

      date.setHours(
        0,
        0,
        0,
        0,
      );

      eventDates.add(
        date
          .toISOString()
          .slice(0, 10),
      );
    });

    let streak = 0;
    const currentDate =
      new Date(today);

    while (true) {
      const dateKey =
        currentDate
          .toISOString()
          .slice(0, 10);

      if (
        !eventDates.has(
          dateKey,
        )
      ) {
        break;
      }

      streak += 1;

      currentDate.setDate(
        currentDate.getDate() - 1,
      );
    }

    return streak;
  },

  /**
   * Get total minutes completed today.
   */
  getMinutesToday(
    userId: string,
  ): number {
    const events =
      getCompletionEvents(userId);

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0,
    );

    const tomorrow =
      new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1,
    );

    return events
      .filter((event) => {
        const date =
          new Date(
            event.completedAt,
          );

        return (
          !Number.isNaN(
            date.getTime(),
          ) &&
          date >= today &&
          date < tomorrow
        );
      })
      .reduce(
        (total, event) =>
          total +
          event.durationMinutes,
        0,
      );
  },

  /**
   * Get total hours studied during the last 7 days.
   */
  getHoursThisWeek(
    userId: string,
  ): number {
    const events =
      getCompletionEvents(userId);

    const now = new Date();

    const sevenDaysAgo =
      new Date(now);

    sevenDaysAgo.setDate(
      sevenDaysAgo.getDate() - 7,
    );

    const minutes =
      events
        .filter((event) => {
          const date =
            new Date(
              event.completedAt,
            );

          return (
            !Number.isNaN(
              date.getTime(),
            ) &&
            date >= sevenDaysAgo
          );
        })
        .reduce(
          (total, event) =>
            total +
            event.durationMinutes,
          0,
        );

    return Math.round(
      (minutes / 60) * 10,
    ) / 10;
  },

  /**
   * Get study-time breakdown
   * for the last 7 days.
   */
  getWeeklyBreakdown(
    userId: string,
  ): {
    day: string;
    minutes: number;
  }[] {
    const events =
      getCompletionEvents(userId);

    const now = new Date();

    const breakdown: Record<
      string,
      number
    > = {};

    /**
     * Keep the actual 7 dates so that
     * duplicate weekday names can never
     * cause incorrect chart data.
     */
    const lastSevenDays: {
      day: string;
      dateKey: string;
    }[] = [];

    for (
      let i = 6;
      i >= 0;
      i -= 1
    ) {
      const date =
        new Date(now);

      date.setDate(
        date.getDate() - i,
      );

      date.setHours(
        0,
        0,
        0,
        0,
      );

      const day =
        getDayName(date);

      const dateKey =
        date
          .toISOString()
          .slice(0, 10);

      lastSevenDays.push({
        day,
        dateKey,
      });

      breakdown[dateKey] = 0;
    }

    /**
     * Add completion minutes to
     * the correct calendar day.
     */
    events.forEach((event) => {
      const date =
        new Date(
          event.completedAt,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return;
      }

      const dateKey =
        date
          .toISOString()
          .slice(0, 10);

      if (
        Object.prototype.hasOwnProperty.call(
          breakdown,
          dateKey,
        )
      ) {
        breakdown[dateKey] =
          (breakdown[dateKey] ?? 0) +
          event.durationMinutes;
      }
    });

    return lastSevenDays.map(
      (item) => ({
        day: item.day,
        minutes:
          breakdown[item.dateKey] ??
          0,
      }),
    );
  },

  /**
   * Clear all completion events
   * for a user.
   */
  clearCompletionEvents(
    userId: string,
  ): void {
    if (
      typeof window === "undefined" ||
      !userId
    ) {
      return;
    }

    try {
      const key =
        `${COMPLETION_EVENTS_KEY}.${userId}`;

      window.localStorage.removeItem(
        key,
      );
    } catch {
      // Ignore localStorage errors.
    }
  },
};