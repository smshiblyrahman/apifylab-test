import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import FeedClient from "@/components/FeedClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed — Buddy Script",
  description: "Your social feed — create posts, like, comment, and connect.",
};

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const firstName = (session.user as any).firstName ?? session.user.name?.split(" ")[0] ?? "User";
  const fullName = session.user.name ?? "User";

  return (
    <div className="_layout _layout_main_wrapper">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light _header_nav _padd_t10">
        <div className="container _custom_container">
          <div className="_logo_wrap">
            <a className="navbar-brand" href="/feed">
              <img src="/assets/images/logo.svg" alt="Buddy Script" className="_nav_logo" />
            </a>
          </div>
          <button
            className="navbar-toggler bg-light"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarMain"
            aria-controls="navbarMain"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="navbarMain">
            <div className="_header_form ms-auto">
              <form className="_header_form_grp" role="search">
                <svg className="_header_form_svg" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 17 17">
                  <circle cx="7" cy="7" r="6" stroke="#666" />
                  <path stroke="#666" strokeLinecap="round" d="M16 16l-3-3" />
                </svg>
                <input className="form-control me-2 _inpt1" type="search" placeholder="Search" aria-label="Search" />
              </form>
            </div>
            <ul className="navbar-nav mb-2 mb-lg-0 _header_nav_list ms-auto _mar_r8">
              <li className="nav-item _header_nav_item">
                <a className="nav-link _header_nav_link_active _header_nav_link" href="/feed" aria-current="page">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="21" fill="none" viewBox="0 0 18 21">
                    <path className="_home_active" stroke="#000" strokeWidth="1.5" strokeOpacity=".6" d="M1 9.924c0-1.552 0-2.328.314-3.01.313-.682.902-1.187 2.08-2.196l1.143-.98C6.667 1.913 7.732 1 9 1c1.268 0 2.333.913 4.463 2.738l1.142.98c1.179 1.01 1.768 1.514 2.081 2.196.314.682.314 1.458.314 3.01v4.846c0 2.155 0 3.233-.67 3.902-.669.67-1.746.67-3.901.67H5.57c-2.155 0-3.232 0-3.902-.67C1 18.002 1 16.925 1 14.77V9.924z" />
                    <path className="_home_active" stroke="#000" strokeOpacity=".6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.857 19.341v-5.857a1 1 0 00-1-1H7.143a1 1 0 00-1 1v5.857" />
                  </svg>
                </a>
              </li>
            </ul>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: 14, fontWeight: 500 }}>{fullName}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  id="logout-btn"
                  className="_btn1"
                  style={{ padding: "6px 16px", fontSize: 13 }}
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main layout */}
      <div className="_main_layout">
        <div className="container _custom_container h-100">
          <div className="row h-100">
            {/* Left sidebar placeholder */}
            <div className="col-xl-3 col-lg-3 d-none d-lg-block">
              <div className="_layout_left_sidebar_wrap">
                <div className="_layout_left_wrap">
                  <div className="text-center py-3">
                    <img
                      src="/assets/images/Avatar.png"
                      alt="Profile"
                      style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }}
                    />
                    <p style={{ marginTop: 8, fontWeight: 600 }}>{fullName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed column */}
            <div className="col-xl-6 col-lg-6 col-md-12">
              <div className="_layout_middle_wrap">
                <FeedClient
                  userId={userId}
                  userFirstName={firstName}
                  userFullName={fullName}
                />
              </div>
            </div>

            {/* Right sidebar placeholder */}
            <div className="col-xl-3 col-lg-3 d-none d-lg-block">
              <div className="_layout_right_sidebar_wrap">
                <div className="_layout_right_wrap">
                  <p style={{ fontSize: 13, color: "#aaa", textAlign: "center", paddingTop: 16 }}>
                    Buddy Script
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
