"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { registerSchema } from "@/lib/validators";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    setGlobalError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    // Client-side validation
    if (form.password !== form.confirmPassword) {
      setErrors((p) => ({ ...p, confirmPassword: "Passwords do not match." }));
      return;
    }

    const parsed = registerSchema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
    });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({
        firstName: fe.firstName?.[0] ?? "",
        lastName: fe.lastName?.[0] ?? "",
        email: fe.email?.[0] ?? "",
        password: fe.password?.[0] ?? "",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error?.message ?? "Registration failed. Try again.");
        return;
      }

      // Auto sign-in after successful registration
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      router.push("/feed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="_social_registration_wrapper _layout_main_wrapper">
      <div className="_shape_one">
        <img src="/assets/images/shape1.svg" alt="" className="_shape_img" />
        <img src="/assets/images/dark_shape.svg" alt="" className="_dark_shape" />
      </div>
      <div className="_shape_two">
        <img src="/assets/images/shape2.svg" alt="" className="_shape_img" />
        <img src="/assets/images/dark_shape1.svg" alt="" className="_dark_shape _dark_shape_opacity" />
      </div>
      <div className="_shape_three">
        <img src="/assets/images/shape3.svg" alt="" className="_shape_img" />
        <img src="/assets/images/dark_shape2.svg" alt="" className="_dark_shape _dark_shape_opacity" />
      </div>
      <div className="_social_registration_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_registration_right">
                <div className="_social_registration_right_image">
                  <img src="/assets/images/registration.png" alt="Register illustration" />
                </div>
                <div className="_social_registration_right_image_dark">
                  <img src="/assets/images/registration1.png" alt="Register illustration dark" />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_registration_content">
                <div className="_social_registration_right_logo _mar_b28">
                  <img src="/assets/images/logo.svg" alt="Buddy Script" className="_right_logo" />
                </div>
                <p className="_social_registration_content_para _mar_b8">Get Started Now</p>
                <h1 className="_social_registration_content_title _titl4 _mar_b50" style={{ fontSize: "17px" }}>
                  Registration
                </h1>

                {globalError && (
                  <div className="alert alert-danger py-2 mb-3" role="alert" style={{ fontSize: "14px" }}>
                    {globalError}
                  </div>
                )}

                <form className="_social_registration_form" onSubmit={handleSubmit} noValidate>
                  <div className="row">
                    <div className="col-xl-6 col-lg-6 col-md-6">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8" htmlFor="reg-firstName">
                          First Name
                        </label>
                        <input
                          id="reg-firstName"
                          type="text"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleChange}
                          className={`form-control _social_registration_input${errors.firstName ? " is-invalid" : ""}`}
                          placeholder="First name"
                          autoComplete="given-name"
                        />
                        {errors.firstName && (
                          <div className="invalid-feedback">{errors.firstName}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-xl-6 col-lg-6 col-md-6">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8" htmlFor="reg-lastName">
                          Last Name
                        </label>
                        <input
                          id="reg-lastName"
                          type="text"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleChange}
                          className={`form-control _social_registration_input${errors.lastName ? " is-invalid" : ""}`}
                          placeholder="Last name"
                          autoComplete="family-name"
                        />
                        {errors.lastName && (
                          <div className="invalid-feedback">{errors.lastName}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-xl-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8" htmlFor="reg-email">
                          Email
                        </label>
                        <input
                          id="reg-email"
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          className={`form-control _social_registration_input${errors.email ? " is-invalid" : ""}`}
                          placeholder="Enter your email"
                          autoComplete="email"
                        />
                        {errors.email && (
                          <div className="invalid-feedback">{errors.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-xl-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8" htmlFor="reg-password">
                          Password
                        </label>
                        <input
                          id="reg-password"
                          type="password"
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          className={`form-control _social_registration_input${errors.password ? " is-invalid" : ""}`}
                          placeholder="Min 8 characters"
                          autoComplete="new-password"
                        />
                        {errors.password && (
                          <div className="invalid-feedback">{errors.password}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-xl-12">
                      <div className="_social_registration_form_input _mar_b14">
                        <label className="_social_registration_label _mar_b8" htmlFor="reg-confirmPassword">
                          Repeat Password
                        </label>
                        <input
                          id="reg-confirmPassword"
                          type="password"
                          name="confirmPassword"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          className={`form-control _social_registration_input${errors.confirmPassword ? " is-invalid" : ""}`}
                          placeholder="Repeat password"
                          autoComplete="new-password"
                        />
                        {errors.confirmPassword && (
                          <div className="invalid-feedback">{errors.confirmPassword}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="_social_registration_form_btn _mar_t40 _mar_b60">
                        <button
                          type="submit"
                          id="register-submit-btn"
                          className="_social_registration_form_btn_link _btn1"
                          disabled={loading}
                        >
                          {loading ? "Creating account…" : "Register now"}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="row">
                  <div className="col-xl-12">
                    <div className="_social_registration_bottom_txt">
                      <p className="_social_registration_bottom_txt_para">
                        Already have an account?{" "}
                        <Link href="/login">Login</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
