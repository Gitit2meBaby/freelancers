// app/privacy-policy/page.js
import styles from "../styles/privacy-policy.module.scss";

export const metadata = {
  title: "Privacy Policy | Freelancers Promotions",
  description:
    "Privacy Policy for Freelancers Promotions - Learn how we collect, use, and protect your personal information in compliance with Australian Privacy Principles.",
};

export default function PrivacyPolicyPage() {
  return (
    <main
      className={styles.privacyPage}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={styles.container}>
        <h1>Privacy Policy</h1>

        <p className={styles.intro}>
          At Freelancers Promotions, we are committed to protecting the privacy
          and confidentiality of personal information in compliance with the
          Australian Privacy Principles (APPs) under the Privacy Act 1988 (Cth).
        </p>

        <section className={styles.section}>
          <h2>Introduction</h2>
          <p>
            This Privacy Policy outlines how we collect, use, disclose, and
            protect personal information from three distinct groups: website
            visitors, our clients (freelance film crew) and the organisations
            with whom we engage for the purposes of booking crew (production
            companies). Please read this policy carefully to understand our
            practices regarding your personal information and how we handle it.
          </p>
          <p>
            For the purpose of this Privacy Policy, "we," "our," or "Freelancers
            Promotions" refers to our company.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Collection of Personal Information</h2>
          <p>
            We collect personal information from website visitors, our clients
            and production companies to provide our services and facilitate the
            booking process. The personal information we collect may include,
            but is not limited to:
          </p>

          <h3>Clients (Freelance Film Crew):</h3>
          <ul>
            <li>Name</li>
            <li>Phone number</li>
            <li>Email address</li>
            <li>Employment history/credits list</li>
            <li>Working with Children Check (where applicable)</li>
          </ul>

          <h3>Production Companies:</h3>
          <ul>
            <li>Production company name</li>
            <li>Contact person's name</li>
            <li>Contact person's role (e.g. producer, production manager)</li>
            <li>Contact person's phone number and email address</li>
            <li>Shoot location and booking dates</li>
            <li>Key crew members (e.g. Producer, director etc)</li>
          </ul>

          <h3>Website Visitors:</h3>
          <ul>
            <li>IP address</li>
            <li>Browser type</li>
            <li>Operating system</li>
            <li>Pages visited on our website</li>
            <li>
              Personal information voluntarily provided through website forms
              (e.g. name, email address)
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Use and Disclosure of Personal Information</h2>

          <p>
            <strong>Clients (Freelance Film Crew):</strong> We use your personal
            information to provide you with our services, communicate with you
            about booking enquiries, and facilitate the booking process. We may
            disclose your contact information to production companies that are
            seeking to book crew members for upcoming productions. However, we
            do not disclose details of your other bookings or holds to other
            production companies.
          </p>

          <p>
            <strong>Production Companies:</strong> We use the personal
            information provided by production companies to facilitate the
            booking process and communicate with them regarding crew
            availability and bookings. We may also disclose their contact
            information to our clients (freelance film crew) for the purpose of
            logistical and booking arrangements.
          </p>

          <p>
            <strong>Website Visitors:</strong> We use the personal information
            collected from website visitors to analyse and improve the
            performance, functionality, and content of our website. We may also
            use the information to respond to enquiries or requests submitted
            through website forms and provide relevant information about our
            services.
          </p>

          <p>
            We may disclose personal information to third-party service
            providers who assist us in providing our services, such as website
            hosting and accounts management. These service providers are
            required to comply with applicable privacy laws and protect your
            personal information.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Protection of Personal Information</h2>
          <p>
            We take reasonable measures to protect your personal information
            from unauthorised access, use, or disclosure. We maintain
            industry-standard security measures, including encryption,
            firewalls, and secure servers, to safeguard your personal
            information.
          </p>
          <p>
            We have implemented procedures to ensure that our employees and
            contractors comply with privacy laws and handle personal information
            responsibly. Access to personal information is limited to authorised
            individuals who require it to perform their job duties.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Access and Correction of Personal Information</h2>
          <p>
            You have the right to access and correct the personal information we
            hold about you. If you would like to access or correct your personal
            information, please contact us using the contact details provided
            below. We will respond to your request within a reasonable
            timeframe.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Retention of Personal Information</h2>
          <p>
            We retain personal information for as long as necessary to fulfil
            the purposes for which it was collected or as required by law. When
            personal information is no longer needed, we securely remove it from
            our systems.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact Us</h2>
          <p>
            If you have any questions or concerns about our Privacy Policy or
            the handling of your personal information, please contact us using
            the following details:
          </p>
          <address className={styles.contact}>
            <strong>Freelancers Promotions</strong>
            <br />
            Email:{" "}
            <a href="mailto:info@freelancers.com.au">info@freelancers.com.au</a>
          </address>
          <p>
            We take your privacy seriously and will respond to your enquiry as
            soon as possible.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Changes to Privacy Policy</h2>
          <p>
            We reserve the right to update or change this Privacy Policy at any
            time. The latest version will be posted on our website. Your
            continued use of our website or services after any modifications
            will constitute your acknowledgment and agreement to the updated
            Privacy Policy.
          </p>
        </section>

        <footer className={styles.lastUpdated}>
          <p>Last updated: January 2025</p>
        </footer>
      </div>
    </main>
  );
}
