
'use server';

/**
 * @fileOverview An AI agent for providing help to students about the platform.
 *
 * - studentHelp - A function that answers questions about the platform.
 * - StudentHelpInput - The input type for the studentHelp function.
 * - StudentHelpOutput - The return type for the studentHelp function.
 */

import { ai } from '@/ai/genkit-instance';
import {z} from 'genkit';

const StudentHelpInputSchema = z.object({
  question: z.string().describe('The question the user is asking about the site.'),
});
export type StudentHelpInput = z.infer<typeof StudentHelpInputSchema>;

const StudentHelpOutputSchema = z.object({
  answer: z.string().describe("The AI assistant's helpful answer to the user's question."),
});
export type StudentHelpOutput = z.infer<typeof StudentHelpOutputSchema>;

export async function studentHelp(
  input: StudentHelpInput
): Promise<StudentHelpOutput> {
  return studentHelpFlow(input);
}

const prompt = ai.definePrompt({
  name: 'studentHelpPrompt',
  input: {schema: StudentHelpInputSchema},
  output: {schema: StudentHelpOutputSchema},
  prompt: `You are an AI support agent for the Manda Network online learning platform. Your tone is friendly, helpful, and professional. A student is asking you a question about how the platform works.

  Use the following information about the student journey to answer their question comprehensively and in detail.

  **Platform Overview: Manda Network**
  Manda Network is an online learning platform for Kenyan users. It features courses created and managed by an admin. Students can enroll, learn, take exams, and earn certificates.

  **The Student Journey**

  1.  **Discovery & Enrollment**:
      *   Logged-out users see public pages like Courses, About, Help, and Contact.
      *   To enroll, a user must sign up or log in.
      *   Courses can be free or paid.
      *   For paid courses, the user "pays" via a simulated M-Pesa modal. No real payment is processed. For free courses, they enroll with one click.
      *   Once enrolled, the course appears on their dashboard.

  2.  **Learning**:
      *   From their dashboard, a student clicks "Jump Back In" to go to the course player.
      *   The course player shows modules and lessons.
      *   The student watches lesson videos (if available) and reads the content.
      *   After each lesson, they click "Mark as Completed & Continue" to advance. Their progress is tracked.

  3.  **Final Exam**:
      *   Once all lessons are complete (100% progress), the Final Exam is unlocked.
      *   The student navigates to the exam page from the course player or their "My Exams" page.
      *   The exam consists of a single short-answer question. The student submits their answer.
      *   Upon submission, the exam is marked as "completed" for the student and awaits grading.

  4.  **Grading (Admin Task)**:
      *   An admin reviews the submission and grades it. This is usually done with AI assistance to ensure fairness and speed.

  5.  **Certification**:
      *   A student must score 8/10 or higher to pass the exam.
      *   If they pass, a certificate is automatically made available to them.
      *   The student can see their completed courses and a "View Certificate" button on their main dashboard.
      *   They can view the certificate and print or download it.

  **Student's Question**:
  "{{{question}}}"

  Please provide a clear, helpful answer from the perspective of a student using the platform.`,
});

const studentHelpFlow = ai.defineFlow(
  {
    name: 'studentHelpFlow',
    inputSchema: StudentHelpInputSchema,
    outputSchema: StudentHelpOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
