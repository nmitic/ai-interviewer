import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";
dotenv.config();

const client = new GraphQLClient(
  process.env.NEXT_PUBLIC_HYGRAPH_READ_ONLY as string
);

const jobsQuery = gql`
  query Jobs {
    nikola_mitic_short_introduction: page(where: { slug: "tiny-thoughts" }) {
      description {
        text
      }
    }
    nikola_mitic_answer_to_common_job_interview_questions: page(
      where: { slug: "interviewer-ai-meta-data" }
    ) {
      description {
        text
      }
    }
    nikola_mitic_resume_cv_work_experience: jobs(orderBy: startDate_DESC) {
      job_description_and_responsibilities: description {
        text
      }
      company: companyName
      website_of_company: companyWebsite
      company_industry: industry
      company_location: location
      date_when_nikola_mitic_started_working_here: startDate
      date_when_nikola_mitic_ended_working_here: endDate
      tools_programming_languages_frameworks_nikola_mitic_used_in_this_job: techStackTools
      job_position_title: title
      project_that_nikola_mitic_worked_on: jobProjects {
        ... on Post {
          id
          title
          content {
            project_description: text
          }
        }
      }
      team_member_structure_and_amount: teamMembersJobTitles
      projectManagement
    }
    nikola_mitic_thoughts_on_various_subjects: tinyThoughts(first: 100) {
      content {
        text
      }
    }
  }
`;

export const getAnswerSource = async (): Promise<string> => {
  return await client.request(jobsQuery);
};
