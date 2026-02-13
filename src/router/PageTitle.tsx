import { useEffect } from "react";
import { useAppSelector } from "../redux/hooks.ts";

const PageTitle = ({ title }: { title?: string }) => {
  const siteTitle = useAppSelector((state) => state.siteConfig.basic.config.title);

  useEffect(() => {
    const titles: string[] = [];
    if (title) {
      titles.push(title);
    }

    if (siteTitle) {
      titles.push(siteTitle);
    }

    document.title = titles.join(" - ");
  }, [title, siteTitle]);

  return null;
};

export default PageTitle;
