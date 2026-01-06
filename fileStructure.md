# Freelancers Promotions - File Structure

```
freelancers-promotions/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.js
│   │   ├── crew-directory/
│   │   │   ├── [departmentSlug]/
│   │   │   │   ├── [skillSlug]/
│   │   │   │   │   └── route.js
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── freelancer/
│   │   │   └── [slug]/
│   │   │       └── route.js
│   │   ├── profile/
│   │   │   └── update/
│   │   │       └── route.js
│   │   ├── screen-services/
│   │   │   ├── [slug]/
│   │   │   │   └── route.js
│   │   │   ├── debug-slugs/
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   └── upload-blob/
│   │       └── route.js
│   │
│   ├── components/
│   │   ├── ActiveNavLink.jsx
│   │   ├── Banner.jsx
│   │   ├── ButtonSection.jsx
│   │   ├── ContactForm.jsx
│   │   ├── CookieConsent.jsx
│   │   ├── Copyright.jsx
│   │   ├── Footer.jsx
│   │   ├── Hamburger.jsx
│   │   ├── Header.jsx
│   │   ├── HomeButtons.jsx
│   │   ├── HomeSlider.jsx
│   │   ├── ImageCarousel.jsx
│   │   ├── Navigation.jsx
│   │   ├── News.jsx
│   │   ├── ProfilePic.jsx
│   │   ├── ScreenServiceCard.jsx
│   │   ├── SearchBar.jsx
│   │   └── SessionProvider.jsx
│   │
│   ├── crew-directory/
│   │   ├── [departmentSlug]/
│   │   │   ├── [skillSlug]/
│   │   │   │   ├── (components)/
│   │   │   │   │   └── FreelancerButtons.jsx
│   │   │   │   └── page.js
│   │   │   └── page.js
│   │   ├── (components)/
│   │   │   └── DownloadSelect.jsx
│   │   ├── layout.js
│   │   └── page.js
│   │
│   ├── member-login/
│   │   ├── (components)/
│   │   │   ├── FreelancerButtons.jsx
│   │   │   ├── FreelancerModal.jsx
│   │   │   └── LoginForm.jsx
│   │   └── page.js
│   │
│   ├── my-account/
│   │   ├── [slug]/
│   │   │   └── page.js
│   │   └── layout.js
│   │
|   ├── edit-profile/
│   │       └── page.js
│   │
│   ├── styles/
│   │   ├── aboutUs_module.scss
│   │   ├── banner_module.scss
│   │   ├── bookingGuidelines_module.scss
│   │   ├── contactUs_module.scss
│   │   ├── cookieConsent_module.scss
│   │   ├── copyright_module.scss
│   │   ├── crewDirectory_module.scss
│   │   ├── editProfile_module.scss
│   │   ├── footer_module.scss
│   │   ├── freelancerModal_module.scss
│   │   ├── header_module.scss
│   │   ├── home_module.scss
│   │   ├── homeButtons_module.scss
│   │   ├── homeSlider_module.scss
│   │   ├── imageCarousel_module.scss
│   │   ├── memberLogin_module.scss
│   │   ├── navigation_module.scss
│   │   ├── news_module.scss
│   │   ├── profile_module.scss
│   │   ├── profilePic_module.scss
│   │   ├── screenService_module.scss
│   │   └── team_module.scss
│   │
│   ├── globals.css
│   ├── layout.js
│   ├── page.js
│   └── logo.png
├── public/
│   └── logo.png
│
├── scripts/
│   ├── analyze-data.js
│   ├── categoryHierarchy.js
│   ├── categoryPages.js
│   ├── clean-filenames.js
│   ├── downloadMedia.js
│   ├── pageScraper-improved.js
│   ├── screen-services-data.js
│   └── wp-test-fetch.js
│
├── jsconfig.json
├── next_config.mjs
├── package.json
├── PROFILE_UPDATE_DOCS.md
└── TODO.md
```
