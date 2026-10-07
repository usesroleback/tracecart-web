import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — Terravia",
  description: "Connectez-vous à votre espace Terravia.",
};

export default function SignIn() {
  return <SignInForm />;
}
