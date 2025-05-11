import pandas as pd
import os

def merge_datasets(base_filename):
    files = [f for f in os.listdir() if f.startswith(base_filename)]
    pt1_files = [f for f in files if '_pt1' in f]
    pt2_files = [f for f in files if '_pt2' in f]
    
    if not pt1_files or not pt2_files:
        print(f"No files found for {base_filename}")
        return
    
    df_pt1 = pd.read_csv(pt1_files[0])
    df_pt2 = pd.read_csv(pt2_files[0])
    merged_df = pd.concat([df_pt1, df_pt2]).drop_duplicates(subset=['id'])
    
    output_filename = f"{base_filename}_merged.csv"
    merged_df.to_csv(output_filename, index=False, encoding='utf-8')
    print(f"Merged file saved as {output_filename} ({len(merged_df)} records)")
    
    return merged_df

def merge_all_datasets():
    print("Merging datasets...\n")
    
    skills_df = merge_datasets('vacancies_with_skills')
    empty_df = merge_datasets('vacancies_empty')
    error_df = merge_datasets('error_vacancies')
    #try:
    #    error_files = [f for f in os.listdir() if f.startswith('error_vacancies')]
    #    if len(error_files) >= 2:
    #        error_dfs = [pd.read_csv(f) for f in error_files]
    #        merged_errors = pd.concat(error_dfs).drop_duplicates()
    #        merged_errors.to_csv('error_vacancies_merged.csv', index=False)
    #        print(f"Merged error vacancies saved ({(len(merged_errors))} records)")
    #except Exception as e:
    #    print(f"Error merging error files: {e}")
    
    try:
        import json
        skills_data_files = [f for f in os.listdir() if f.startswith('skills_data') and f.endswith('.json')]
        if len(skills_data_files) >= 2:
            all_skills = []
            for f in skills_data_files:
                with open(f, 'r', encoding='utf-8') as infile:
                    all_skills.extend(json.load(infile))
            
            # Aggregate skills counts
            skills_df = pd.DataFrame(all_skills)
            merged_skills = skills_df.groupby('skill')['count'].sum().reset_index()
            
            with open('skills_data_merged.json', 'w', encoding='utf-8') as outfile:
                json.dump(merged_skills.to_dict('records'), outfile, ensure_ascii=False, indent=2)
            print("Merged skills data saved to skills_data_merged.json")
    except Exception as e:
        print(f"Error merging skills data: {e}")

if __name__ == "__main__":
    merge_all_datasets()
