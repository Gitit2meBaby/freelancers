import React, { Suspense } from "react";

import AdminNewsClient from "./(components)/AdminNewsClient";
import Spinner from "../../components/Spinner";

const AdminNewsPage = () => {
  return (
    <section
      style={{ minHeight: "100vh", padding: "2rem", background: "#f5f5f5" }}
      data-page="plain"
      data-footer="noBorder"
    >
      <Suspense
        fallback={
          <>
            <Spinner />
          </>
        }
      >
        <AdminNewsClient />
      </Suspense>
    </section>
  );
};

export default AdminNewsPage;
