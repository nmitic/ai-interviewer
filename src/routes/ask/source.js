import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";
dotenv.config();

const client = new GraphQLClient(process.env.NEXT_PUBLIC_HYGRAPH_READ_ONLY);

const jobsQuery = gql`
  query Jobs {
    page(where: { slug: "tiny-thoughts" }) {
      description {
        text
      }
    }
    jobs(orderBy: startDate_DESC) {
      job_description_and_responsibilities: description {
        text
      }
      companyName
      companyWebsite
      industry
      location
      date_when_you_started_working_here: startDate
      date_when_you_ended_working_here: endDate
      tools_programming_languages_frameworks_you_used_in_this_job: techStackTools
      job_position_title: title
      project_that_I_worked_on:jobProjects {
        ... on Post {
          id
          title
          content {
            project_description:text
          }
        }
      }
      team_member_structure_and_amount:teamMembersJobTitles
      projectManagement
    }
    nikola_mitic_thoughts_on_various_subjects: tinyThoughts(first: 100) {
      content {
        text
      }
    }
  }
`;

export const getAnswerSource = async () => {
  return await client.request(jobsQuery);
};
