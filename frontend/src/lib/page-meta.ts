import { useEffect } from 'react';

type PageMeta = {
  title: string;
  description: string;
};

export const usePageMeta = ({ title, description }: PageMeta) => {
  useEffect(() => {
    document.title = title;

    let descriptionElement = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );

    if (!descriptionElement) {
      descriptionElement = document.createElement('meta');
      descriptionElement.name = 'description';
      document.head.append(descriptionElement);
    }

    descriptionElement.content = description;
  }, [description, title]);
};
