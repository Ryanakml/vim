"use client";

import { useState } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">
          <svg width="130" height="30" viewBox="0 0 130 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="paint0_linear_2_1973" x1="-98.3784" y1="-126.522" x2="-139.557" y2="-17.5792" gradientUnits="userSpaceOnUse">
                <stop offset="0.175295" stopColor="#FF0F65" />
                <stop offset="0.412259" stopColor="#FF6B5F" />
                <stop offset="0.479632" stopColor="#E46C8B" />
                <stop offset="0.545288" stopColor="#A860EC" />
                <stop offset="0.621356" stopColor="#AD5EE3" />
                <stop offset="0.760955" stopColor="#BE55BF" />
                <stop offset="0.810005" stopColor="#D5458A" />
                <stop offset="0.877831" stopColor="#F91748" />
              </linearGradient>
              <clipPath id="clip0_2_1973">
                <rect width="130" height="30" fill="white" />
              </clipPath>
            </defs>
            <g clipPath="url(#clip0_2_1973)">
              <mask id="mask0_2_1973" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="130" height="30">
                <path d="M130 0H0V30H130V0Z" fill="white" />
              </mask>
              <g mask="url(#mask0_2_1973)">
                <path d="M10.3135 25.288C9.0335 25.288 7.8495 25.056 6.7615 24.592C5.6895 24.128 4.7455 23.48 3.9295 22.648C3.1295 21.816 2.5055 20.84 2.0575 19.72C1.6095 18.6 1.3855 17.376 1.3855 16.048C1.3855 14.72 1.6015 13.496 2.0335 12.376C2.4815 11.24 3.1055 10.264 3.9055 9.44803C4.7215 8.61603 5.6735 7.97603 6.7615 7.52803C7.8495 7.06403 9.0335 6.83203 10.3135 6.83203C11.5935 6.83203 12.7375 7.04803 13.7455 7.48003C14.7695 7.91203 15.6335 8.48803 16.3375 9.20803C17.0415 9.91203 17.5455 10.688 17.8495 11.536L14.9215 12.904C14.5855 12.008 14.0175 11.272 13.2175 10.696C12.4175 10.104 11.4495 9.80803 10.3135 9.80803C9.1935 9.80803 8.2015 10.072 7.3375 10.6C6.4895 11.128 5.8255 11.856 5.3455 12.784C4.8815 13.712 4.6495 14.8 4.6495 16.048C4.6495 17.296 4.8815 18.392 5.3455 19.336C5.8255 20.264 6.4895 20.992 7.3375 21.52C8.2015 22.048 9.1935 22.312 10.3135 22.312C11.4495 22.312 12.4175 22.024 13.2175 21.448C14.0175 20.856 14.5855 20.112 14.9215 19.216L17.8495 20.584C17.5455 21.432 17.0415 22.216 16.3375 22.936C15.6335 23.64 14.7695 24.208 13.7455 24.64C12.7375 25.072 11.5935 25.288 10.3135 25.288ZM19.9954 25V6.83203H23.1394V14.512L22.7074 14.056C23.0114 13.272 23.5074 12.68 24.1954 12.28C24.8994 11.864 25.7154 11.656 26.6434 11.656C27.6034 11.656 28.4514 11.864 29.1874 12.28C29.9394 12.696 30.5234 13.28 30.9394 14.032C31.3554 14.768 31.5634 15.624 31.5634 16.6V25H28.4194V17.344C28.4194 16.768 28.3074 16.272 28.0834 15.856C27.8594 15.44 27.5474 15.12 27.1474 14.896C26.7634 14.656 26.3074 14.536 25.7794 14.536C25.2674 14.536 24.8114 14.656 24.4114 14.896C24.0114 15.12 23.6994 15.44 23.4754 15.856C23.2514 16.272 23.1394 16.768 23.1394 17.344V25H19.9954ZM37.942 25.288C37.03 25.288 36.238 25.136 35.566 24.832C34.894 24.528 34.374 24.096 34.006 23.536C33.638 22.96 33.454 22.296 33.454 21.544C33.454 20.824 33.614 20.184 33.934 19.624C34.254 19.048 34.75 18.568 35.422 18.184C36.094 17.8 36.942 17.528 37.966 17.368L42.238 16.672V19.072L38.566 19.696C37.942 19.808 37.478 20.008 37.174 20.296C36.87 20.584 36.718 20.96 36.718 21.424C36.718 21.872 36.886 22.232 37.222 22.504C37.574 22.76 38.006 22.888 38.518 22.888C39.174 22.888 39.75 22.752 40.246 22.48C40.758 22.192 41.15 21.8 41.422 21.304C41.71 20.808 41.854 20.264 41.854 19.672V16.312C41.854 15.752 41.63 15.288 41.182 14.92C40.75 14.536 40.174 14.344 39.454 14.344C38.782 14.344 38.182 14.528 37.654 14.896C37.142 15.248 36.766 15.72 36.526 16.312L33.958 15.064C34.214 14.376 34.614 13.784 35.158 13.288C35.718 12.776 36.374 12.376 37.126 12.088C37.878 11.8 38.694 11.656 39.574 11.656C40.646 11.656 41.59 11.856 42.406 12.256C43.222 12.64 43.854 13.184 44.302 13.888C44.766 14.576 44.998 15.384 44.998 16.312V25H42.022V22.768L42.694 22.72C42.358 23.28 41.958 23.752 41.494 24.136C41.03 24.504 40.502 24.792 39.91 25C39.318 25.192 38.662 25.288 37.942 25.288ZM53.3815 25.144C51.9095 25.144 50.7655 24.744 49.9495 23.944C49.1495 23.128 48.7495 21.984 48.7495 20.512V14.752H46.4935V11.944H46.7335C47.3735 11.944 47.8695 11.776 48.2215 11.44C48.5735 11.104 48.7495 10.616 48.7495 9.97603V8.96803H51.8935V11.944H54.8935V14.752H51.8935V20.344C51.8935 20.776 51.9655 21.144 52.1095 21.448C52.2695 21.752 52.5095 21.984 52.8295 22.144C53.1655 22.304 53.5895 22.384 54.1015 22.384C54.2135 22.384 54.3415 22.376 54.4855 22.36C54.6455 22.344 54.7975 22.328 54.9415 22.312V25C54.7175 25.032 54.4615 25.064 54.1735 25.096C53.8855 25.128 53.6215 25.144 53.3815 25.144Z" fill="url(#paint0_linear_2_1973)" />
                <path d="M59.9292 25.0001L66.0972 7.12012H70.3212L76.4892 25.0001H72.9372L71.6652 21.1601H64.7532L63.4572 25.0001H59.9292ZM65.6892 18.2801H70.7292L67.7532 9.37612H68.6652L65.6892 18.2801ZM83.8423 30.2801C82.8663 30.2801 81.9623 30.1201 81.1303 29.8001C80.2983 29.4801 79.5783 29.0321 78.9703 28.4561C78.3783 27.8961 77.9463 27.2321 77.6743 26.4641L80.6023 25.3601C80.7943 25.9681 81.1703 26.4561 81.7303 26.8241C82.3063 27.2081 83.0103 27.4001 83.8423 27.4001C84.4823 27.4001 85.0423 27.2801 85.5223 27.0401C86.0183 26.8001 86.4023 26.4481 86.6743 25.9841C86.9463 25.5361 87.0823 24.9921 87.0823 24.3521V21.3761L87.6823 22.0961C87.2343 22.8801 86.6343 23.4721 85.8823 23.8721C85.1303 24.2721 84.2743 24.4721 83.3143 24.4721C82.0983 24.4721 81.0103 24.1921 80.0503 23.6321C79.0903 23.0721 78.3383 22.3041 77.7943 21.3281C77.2503 20.3521 76.9783 19.2561 76.9783 18.0401C76.9783 16.8081 77.2503 15.7121 77.7943 14.7521C78.3383 13.7921 79.0823 13.0401 80.0263 12.4961C80.9703 11.9361 82.0423 11.6561 83.2423 11.6561C84.2183 11.6561 85.0743 11.8641 85.8103 12.2801C86.5623 12.6801 87.1863 13.2641 87.6823 14.0321L87.2503 14.8241V11.9441H90.2263V24.3521C90.2263 25.4881 89.9463 26.5041 89.3863 27.4001C88.8423 28.2961 88.0903 29.0001 87.1303 29.5121C86.1863 30.0241 85.0903 30.2801 83.8423 30.2801ZM83.6983 21.5681C84.3703 21.5681 84.9543 21.4241 85.4503 21.1361C85.9623 20.8321 86.3623 20.4161 86.6503 19.8881C86.9383 19.3601 87.0823 18.7521 87.0823 18.0641C87.0823 17.3921 86.9303 16.7921 86.6263 16.2641C86.3383 15.7201 85.9383 15.2961 85.4263 14.9921C84.9303 14.6881 84.3543 14.5361 83.6983 14.5361C83.0423 14.5361 82.4503 14.6881 81.9223 14.9921C81.3943 15.2961 80.9783 15.7201 80.6743 16.2641C80.3863 16.7921 80.2423 17.3921 80.2423 18.0641C80.2423 18.7361 80.3863 19.3361 80.6743 19.8641C80.9783 20.3921 81.3863 20.8081 81.8983 21.1121C82.4263 21.4161 83.0263 21.5681 83.6983 21.5681ZM99.1146 25.2881C97.7706 25.2881 96.5946 24.9841 95.5866 24.3761C94.5786 23.7681 93.7946 22.9441 93.2346 21.9041C92.6746 20.8641 92.3946 19.7121 92.3946 18.4481C92.3946 17.1361 92.6746 15.9761 93.2346 14.9681C93.8106 13.9441 94.5866 13.1361 95.5626 12.5441C96.5546 11.9521 97.6586 11.6561 98.8746 11.6561C99.8986 11.6561 100.795 11.8241 101.563 12.1601C102.347 12.4961 103.011 12.9601 103.555 13.5521C104.099 14.1441 104.515 14.8241 104.803 15.5921C105.091 16.3441 105.235 17.1601 105.235 18.0401C105.235 18.2641 105.219 18.4961 105.187 18.7361C105.171 18.9761 105.131 19.1841 105.067 19.3601H94.9866V16.9601H103.291L101.803 18.0881C101.947 17.3521 101.907 16.6961 101.683 16.1201C101.475 15.5441 101.123 15.0881 100.627 14.7521C100.147 14.4161 99.5626 14.2481 98.8746 14.2481C98.2186 14.2481 97.6346 14.4161 97.1226 14.7521C96.6106 15.0721 96.2186 15.5521 95.9466 16.1921C95.6906 16.8161 95.5946 17.5761 95.6586 18.4721C95.5946 19.2721 95.6986 19.9841 95.9706 20.6081C96.2586 21.2161 96.6746 21.6881 97.2186 22.0241C97.7786 22.3601 98.4186 22.5281 99.1386 22.5281C99.8586 22.5281 100.467 22.3761 100.963 22.0721C101.475 21.7681 101.875 21.3601 102.163 20.8481L104.707 22.0961C104.451 22.7201 104.051 23.2721 103.507 23.7521C102.963 24.2321 102.315 24.6081 101.563 24.8801C100.827 25.1521 100.011 25.2881 99.1146 25.2881ZM107.378 25.0001V11.9441H110.33V14.5121L110.09 14.0561C110.394 13.2721 110.89 12.6801 111.578 12.2801C112.282 11.8641 113.098 11.6561 114.026 11.6561C114.986 11.6561 115.834 11.8641 116.57 12.2801C117.322 12.6961 117.906 13.2801 118.322 14.0321C118.738 14.7681 118.946 15.6241 118.946 16.6001V25.0001H115.802V17.3441C115.802 16.7681 115.69 16.2721 115.466 15.8561C115.242 15.4401 114.93 15.1201 114.53 14.8961C114.146 14.6561 113.69 14.5361 113.162 14.5361C112.65 14.5361 112.194 14.6561 111.794 14.8961C111.394 15.1201 111.082 15.4401 110.858 15.8561C110.634 16.2721 110.522 16.7681 110.522 17.3441V25.0001H107.378ZM127.316 25.1441C125.844 25.1441 124.7 24.7441 123.884 23.9441C123.084 23.1281 122.684 21.9841 122.684 20.5121V14.7521H120.428V11.9441H120.668C121.308 11.9441 121.804 11.7761 122.156 11.4401C122.508 11.1041 122.684 10.6161 122.684 9.97612V8.96812H125.828V11.9441H128.828V14.7521H125.828V20.3441C125.828 20.7761 125.9 21.1441 126.044 21.4481C126.204 21.7521 126.444 21.9841 126.764 22.1441C127.1 22.3041 127.524 22.3841 128.036 22.3841C128.148 22.3841 128.276 22.3761 128.42 22.3601C128.58 22.3441 128.732 22.3281 128.876 22.3121V25.0001C128.652 25.0321 128.396 25.0641 128.108 25.0961C127.82 25.1281 127.556 25.1441 127.316 25.1441Z" fill="#333333" />
              </g>
            </g>
          </svg>
        </div>

        <nav className="navbar-nav">
          <a href="#overview" className="nav-link nav-link--active">Overview</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#faq" className="nav-link">FAQ&apos;s</a>
          <a href="#get-started" className="nav-cta-btn">Start with Chat Agent</a>
        </nav>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className={`hamburger-bar ${menuOpen ? "hamburger-bar--open-top" : ""}`} />
          <span className={`hamburger-bar ${menuOpen ? "hamburger-bar--open-mid" : ""}`} />
          <span className={`hamburger-bar ${menuOpen ? "hamburger-bar--open-bot" : ""}`} />
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-nav-drawer">
          <a href="#overview" className="mobile-nav-link mobile-nav-link--active" onClick={() => setMenuOpen(false)}>Overview</a>
          <a href="#pricing" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#faq" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>FAQ&apos;s</a>
          <a href="#get-started" className="mobile-nav-cta-btn" onClick={() => setMenuOpen(false)}>Start with Chat Agent</a>
        </div>
      )}

      <style>{`
        .navbar {
          width: 100%;
          background: #F5F4F2;
          border-top: 1px solid #FFF;
          border-bottom: 1px solid #FFF;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
          position: relative;
        }

        .navbar-inner {
          width: 100%;
          max-width: 1200px;
          height: 56px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 119px;
          box-sizing: border-box;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .navbar-nav {
          display: flex;
          align-items: center;
          gap: 50px;
        }

        .nav-link {
          font-family: 'DM Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          letter-spacing: 0.15px;
          color: #1D1D1D;
          text-decoration: none;
        }

        .nav-link--active {
          font-weight: 600;
          text-decoration: underline;
        }

        .nav-cta-btn {
          font-family: 'DM Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 20px;
          letter-spacing: 0.457px;
          color: #FFF;
          text-decoration: none;
          text-transform: capitalize;
          background: #8082EF;
          border: 1px solid #36F;
          border-radius: 8px;
          padding: 7.5px 10px;
          white-space: nowrap;
        }

        .mobile-menu-toggle {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 36px;
          height: 36px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          flex-shrink: 0;
        }

        .hamburger-bar {
          display: block;
          width: 22px;
          height: 2px;
          background: #1D1D1D;
          border-radius: 2px;
          transition: transform 0.2s ease, opacity 0.2s ease;
          transform-origin: center;
        }

        .hamburger-bar--open-top {
          transform: translateY(7px) rotate(45deg);
        }

        .hamburger-bar--open-mid {
          opacity: 0;
        }

        .hamburger-bar--open-bot {
          transform: translateY(-7px) rotate(-45deg);
        }

        .mobile-nav-drawer {
          display: none;
          width: 100%;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          padding: 12px 24px 20px;
          background: #F5F4F2;
          box-sizing: border-box;
          border-top: 1px solid rgba(0,0,0,0.06);
        }

        .mobile-nav-link {
          font-family: 'DM Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          letter-spacing: 0.15px;
          color: #1D1D1D;
          text-decoration: none;
          padding: 10px 0;
          width: 100%;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }

        .mobile-nav-link--active {
          font-weight: 600;
          text-decoration: underline;
        }

        .mobile-nav-cta-btn {
          font-family: 'DM Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 20px;
          letter-spacing: 0.457px;
          color: #FFF;
          text-decoration: none;
          text-transform: capitalize;
          background: #8082EF;
          border: 1px solid #36F;
          border-radius: 8px;
          padding: 10px 16px;
          margin-top: 8px;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .navbar-inner {
            padding: 0 24px;
          }

          .navbar-nav {
            display: none;
          }

          .mobile-menu-toggle {
            display: flex;
          }

          .mobile-nav-drawer {
            display: flex;
          }
        }
      `}</style>
    </header>
  );
}
