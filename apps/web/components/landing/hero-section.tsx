export function HeroSection() {
  return (
    <>
      <style>{`
        .hero-section {
          background: #F1F0EE;
          overflow: hidden;
          position: relative;
          width: 100%;
          min-height: 690px;
        }
        .hero-container {
          max-width: 1438px;
          margin: 0 auto;
          padding: 77px 119px 40px;
          display: flex;
          align-items: flex-start;
          gap: 58px;
          min-height: 690px;
          position: relative;
        }
        .hero-text-col {
          width: 571px;
          flex-shrink: 0;
          padding-top: 113px;
          position: relative;
          z-index: 1;
        }
        .hero-heading {
          font-family: 'Plus Jakarta Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 56px;
          font-weight: 700;
          line-height: 72px;
          letter-spacing: 0.525px;
          color: #1D1D1D;
          margin: 0 0 12px;
          display: flex;
          align-items: center;
        }
        .hero-bot-icon {
          display: inline-block;
          vertical-align: middle;
          margin: 0 1px;
          position: relative;
          top: -6px;
        }
        .hero-tagline {
          font-family: 'Plus Jakarta Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 22px;
          font-weight: 700;
          line-height: 33px;
          letter-spacing: 0.206px;
          color: #1D1D1D;
          margin: 0 0 18px;
          max-width: 530px;
        }
        .hero-description {
          font-family: 'Plus Jakarta Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 18px;
          font-weight: 400;
          line-height: 27px;
          letter-spacing: 0.169px;
          color: #333;
          margin: 0 0 36px;
          max-width: 530px;
        }
        .hero-cta-row {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .btn-get-access {
          display: flex;
          padding: 18px 26px;
          justify-content: center;
          align-items: center;
          border-radius: 8px;
          background: #8082EF;
          color: #FFF;
          font-family: 'DM Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 18px;
          font-weight: 500;
          line-height: 20px;
          letter-spacing: 0.514px;
          text-transform: capitalize;
          border: none;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }
        .btn-book-demo {
          display: flex;
          padding: 18px 26px;
          justify-content: center;
          align-items: center;
          border-radius: 8px;
          border: 1px solid #1D1D1D;
          color: #1D1D1D;
          font-family: 'DM Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 18px;
          font-weight: 500;
          line-height: 20px;
          letter-spacing: 0.514px;
          text-transform: capitalize;
          background: transparent;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }
        .hero-no-card {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #333;
          font-family: 'Plus Jakarta Sans', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 20px;
          letter-spacing: 0.15px;
        }
        .hero-image-col {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding-top: 40px;
        }
        .hero-chat-screenshot {
          width: 556px;
          height: 533px;
          object-fit: cover;
        }
        .hero-bottom-decoration {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100px;
          object-fit: cover;
          pointer-events: none;
        }

        @media (max-width: 1200px) {
          .hero-container {
            padding: 60px 60px 40px;
          }
          .hero-text-col {
            width: 480px;
          }
          .hero-chat-screenshot {
            width: 440px;
            height: auto;
          }
          .hero-heading {
            font-size: 46px;
            line-height: 60px;
          }
        }

        @media (max-width: 900px) {
          .hero-container {
            flex-direction: column;
            align-items: center;
            padding: 60px 32px 40px;
            gap: 40px;
          }
          .hero-text-col {
            width: 100%;
            padding-top: 40px;
          }
          .hero-image-col {
            width: 100%;
            justify-content: center;
            padding-top: 0;
          }
          .hero-chat-screenshot {
            width: 100%;
            max-width: 500px;
            height: auto;
          }
        }

        @media (max-width: 600px) {
          .hero-heading {
            font-size: 36px;
            line-height: 48px;
          }
          .hero-tagline {
            font-size: 18px;
            line-height: 27px;
          }
          .hero-description {
            font-size: 16px;
          }
          .hero-cta-row {
            flex-direction: column;
            align-items: stretch;
          }
          .btn-get-access,
          .btn-book-demo {
            justify-content: center;
          }
          .hero-container {
            padding: 40px 20px 40px;
          }
        }
      `}</style>

      <section className="hero-section">
        <div className="hero-container">
          {/* Left: text content */}
          <div className="hero-text-col">
            <h1 className="hero-heading">
              ItsB
              <svg
                className="hero-bot-icon"
                width="36"
                height="33"
                viewBox="0 0 36 33"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_hero_bot)">
                  <path
                    d="M11.8951 19.0515C13.4709 19.0515 14.7483 17.774 14.7483 16.1981C14.7483 14.6222 13.4709 13.3447 11.8951 13.3447C10.3193 13.3447 9.04187 14.6222 9.04187 16.1981C9.04187 17.774 10.3193 19.0515 11.8951 19.0515Z"
                    fill="#8082EF"
                  />
                  <path
                    d="M19.7682 19.0515C21.3439 19.0515 22.6214 17.774 22.6214 16.1981C22.6214 14.6222 21.3439 13.3447 19.7682 13.3447C18.1924 13.3447 16.9149 14.6222 16.9149 16.1981C16.9149 17.774 18.1924 19.0515 19.7682 19.0515Z"
                    fill="#8082EF"
                  />
                  <path
                    d="M16.2029 0.905679C18.9273 0.745382 21.2529 0.9178 24.0064 1.97054C29.7218 4.15567 31.5721 7.46751 32.9386 9.74478C33.3869 10.4921 34.3787 12.9961 34.3805 13.0003C30.8386 14.4159 34.1647 13.057 31.1569 14.2857C30.4787 14.5528 30.4624 14.5694 30.4624 14.5694C30.5168 14.9155 30.5676 15.979 30.5676 16.4518L30.5674 16.5475C30.5586 17.9188 30.3634 19.2459 30.0058 20.5047C29.6155 21.9619 29.002 23.3566 28.1817 24.6376C26.7874 26.8148 24.8445 28.5866 22.5485 29.775C20.2524 30.9634 17.6839 31.5263 15.1014 31.4073C12.5188 31.2884 10.013 30.4916 7.83586 29.0972C5.65875 27.7027 3.88699 25.7598 2.69873 23.4635C2.37652 22.8409 2.10045 22.1982 1.87132 21.5407C1.30062 19.9822 0.984445 18.301 0.973344 16.5475L0.973022 16.4518C0.973022 8.3109 7.7164 1.45563 16.1041 0.91179L16.2029 0.905679ZM22.2507 6.56343C20.3922 5.85289 18.8467 5.69142 16.7012 5.80268L16.4916 5.81433C10.4708 6.16858 5.88982 11.065 5.88982 16.4518C5.88983 21.9089 10.3135 26.3328 15.7703 26.3328C21.2271 26.3328 25.6508 21.9089 25.6508 16.4518C25.6508 16.3383 25.6428 16.0507 25.6255 15.7234C25.6174 15.5691 25.6085 15.4344 25.6005 15.334C25.5982 15.3048 25.5961 15.2825 25.5947 15.2664L25.3608 13.7794C25.1843 13.1988 24.9548 12.6334 24.6738 12.0904L27.5776 10.5875C27.5983 10.5724 27.6184 10.5582 27.6375 10.5447C27.3247 10.0951 26.99 9.67427 26.5788 9.25152C25.7553 8.40481 24.4991 7.43849 22.3535 6.60313L22.2507 6.56343Z"
                    fill="#1D1D1D"
                    stroke="#1D1D1D"
                    strokeWidth="1.2"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_hero_bot">
                    <rect width="36" height="32.11" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              ot Chat Agent
            </h1>

            <p className="hero-tagline">
              An AI Chatbot for Businesses that Sells, Supports &amp; Converts, around the clock!
            </p>

            <p className="hero-description">
              Tired of missed leads due to slow responses? ItsBot Chat Agent is your 24/7 assistant
              trained to convert, support, and qualify, all while sounding like part of your team.
            </p>

            <div className="hero-cta-row">
              <a href="#" className="btn-get-access">Get Early Access</a>
              <a href="#" className="btn-book-demo">Book A Personalized Demo</a>
            </div>

            <div className="hero-no-card">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6 9H9M3 3L21 21M22 9V17C22 17.5304 21.7893 18.0391 21.4142 18.4142C21.0391 18.7893 20.5304 19 20 19H4C3.46957 19 2.96086 18.7893 2.58579 18.4142C2.21071 18.0391 2 17.5304 2 17V7C2 6.46957 2.21071 5.96086 2.58579 5.58579C2.96086 5.21071 3.46957 5 4 5H5M22 9V7C22 6.46957 21.7893 5.96086 21.4142 5.58579C21.0391 5.21071 20.5304 5 20 5H10M22 9H14"
                  stroke="#333333"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              No credit card required
            </div>
          </div>

          {/* Right: chat interface screenshot */}
          <div className="hero-image-col">
            <img
              className="hero-chat-screenshot"
              src="https://api.builder.io/api/v1/image/assets/TEMP/5ba30c0313f6d3a2a091619e243bf4acf1a92cc9?width=1112"
              alt="ItsBot Chat Agent interface preview"
            />
          </div>
        </div>

        {/* Bottom decorative wave */}
        <img
          className="hero-bottom-decoration"
          src="https://api.builder.io/api/v1/image/assets/TEMP/e58b02c5ae3eb042b4740ac99ef02212fd243648?width=2876"
          alt=""
        />
      </section>
    </>
  );
}
