// freelancers/app/forgot-password/page.js
import React, { Suspense } from "react";

import ForgotPasswordClient from "./(components)/ForgotPasswordClient";
import Spinner from "../components/Spinner";

const ForgotPasswordPage = () => {
  return (
    <>
      <Suspense
        fallback={
          <>
            <Spinner />
          </>
        }
      >
        <ForgotPasswordClient />
      </Suspense>
    </>
  );
};

export default ForgotPasswordPage;
