  async signUp(
    name: string,
    email: string,
    password: string,
  ): Promise<SignUpResult> {
    const normalizedEmail = normalizeEmail(email);
    if (!name.trim()) throw new Error("Please enter your name.");
    if (!normalizedEmail.includes("@")) throw new Error("Enter a valid email address.");
    if (password.length < 6)
      throw new Error("Password must be at least 6 characters.");

    // FORCE VERCEL URL - never localhost
    const siteUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : "https://vidya-a-i-learning-platform-qapyjettw-mussayiby.vercel.app";
    
    const emailRedirectTo = `${siteUrl}/auth/callback`;

    console.log("Signup redirect:", emailRedirectTo); // to verify

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
        emailRedirectTo,
      },
    });

    if (error) {
      if (isRateLimitError(error)) {
        throw new Error("Too many signup emails were requested. Please wait a while before trying again.");
      }
      throw new Error(getAuthErrorMessage(error, "Unable to create your account. Please try again."));
    }
    if (!data.user) throw new Error("Unable to create the account. Please try again.");

    if (data.session) {
      await ensureProfileForUser(data.user);
    }

    return {
      account: toAuthUser(data.user),
      requiresEmailConfirmation: !data.session,
    };
  },
