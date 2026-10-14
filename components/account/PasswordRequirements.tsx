"use client";

import { useTranslations } from "next-intl";
import {
  PASSWORD_REQUIREMENTS,
  passwordMet,
  type PasswordRequirement,
} from "@/lib/validation/password";

const LABEL: Record<PasswordRequirement, string> = {
  length: "pwReqLength",
  lower: "pwReqLower",
  upper: "pwReqUpper",
  digit: "pwReqDigit",
  special: "pwReqSpecial",
};

// Live checklist under a new-password field: each rule turns green when met.
export default function PasswordRequirements({
  password,
}: {
  password: string;
}) {
  const t = useTranslations("Account");
  return (
    <ul
      aria-label={t("pwRequirementsTitle")}
      className="mt-1 grid grid-cols-1 gap-0.5 text-xs sm:grid-cols-2"
    >
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = passwordMet(password, requirement);
        return (
          <li
            key={requirement}
            className={met ? "text-green-700" : "text-taupe-500"}
          >
            <span aria-hidden="true">{met ? "✓" : "○"}</span>{" "}
            {t(LABEL[requirement])}
          </li>
        );
      })}
    </ul>
  );
}
