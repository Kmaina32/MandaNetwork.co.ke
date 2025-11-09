
// This file is used to run the Genkit development server.
// It imports the necessary plugins and flows to be inspected.

import { nextPlugin } from '@genkit-ai/next';

// You can selectively import flows here if you only want to work on a subset.
// For a production-like dev environment, importing all is fine.
import './flows/career-coach';
import './flows/content-strategy';
import './flows/course-tutor';
import './flows/generate-api-key';
import './flows/generate-course-content';
import './flows/generate-exam';
import './flows/grade-short-answer-exam';
import './flows/mpesa-payment';
import './flows/site-help';
import './flows/student-help';
import './flows/send-org-invite';
import './flows/generate-project';
import './flows/generate-document';
import './flows/generate-hackathon-ideas';
import './flows/portfolio-advisor';
import './flows/text-to-speech';

// Tools are automatically registered when imported by a flow,
// but you can also import them directly if needed.
import './tools/course-catalog';

export default {
  plugins: [nextPlugin()],
};
