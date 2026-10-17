import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — TraceCart",
  description: "Connectez-vous à votre espace TraceCart.",
};

export default function SignIn() {
  return <SignInForm />;
}
