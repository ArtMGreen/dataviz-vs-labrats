import requests
import pandas as pd
import time
from tqdm import tqdm

def fetch_vacancies(search_term='лаборант', pages=15, per_page=100):
    vacancies_ids = []
    for page in range(pages):
        try:
            response = requests.get(
                'https://api.hh.ru/vacancies',
                params={
                    'text': search_term,
                    'page': page,
                    'per_page': per_page
                },
                # headers={'User-Agent': 'Mozilla'}
            )
            response.raise_for_status()
            
            data = response.json()
            vacancies_ids.extend([item['id'] for item in data['items']])
            
            time.sleep(1)
            
        except Exception as e:
            print(f"Error fetching page {page}: {e}")
            break
    
    return vacancies_ids

def process_vacancies(vacancy_ids):
    vacancies_with_skills = []
    vacancies_empty = []
    error_ids = []
    
    for vacancy_id in tqdm(vacancy_ids, desc="Processing vacancies"):
        try:
            response = requests.get(
                f'https://api.hh.ru/vacancies/{vacancy_id}',
                # headers={'User-Agent': 'Mozilla'}
            )
            
            if response.status_code != 200:
                print(f"\nError fetching vacancy {vacancy_id}: HTTP {response.status_code}")
                choice = input("Action? (stop/skip/retry/continue): ").lower()
                
                if choice == 'stop':
                    break
                elif choice == 'skip':
                    error_ids.append(vacancy_id)
                    continue
                elif choice == 'retry':
                    response = requests.get(
                        f'https://api.hh.ru/vacancies/{vacancy_id}',
                        # headers={'User-Agent': 'Mozilla'}
                    )
                    response.raise_for_status()
                elif choice == 'continue':
                    continue
            
            vacancy_data = response.json()
            
            if vacancy_data.get('key_skills'):
                skills = [skill['name'] for skill in vacancy_data['key_skills']]
                vacancies_with_skills.append({
                    'id': vacancy_id,
                    'title': vacancy_data.get('name'),
                    'skills': skills,
                    'skills_count': len(skills)
                })
            else:
                vacancies_empty.append({
                    'id': vacancy_id,
                    'title': vacancy_data.get('name'),
                    'reason': 'No skills listed'
                })
            
            time.sleep(1)
            
        except Exception as e:
            print(f"\nError processing vacancy {vacancy_id}: {e}")
            error_ids.append(vacancy_id)
            continue
    
    return vacancies_with_skills, vacancies_empty, error_ids

def save_results(vacancies_with_skills, vacancies_empty, error_ids):
    df_skills = pd.DataFrame(vacancies_with_skills)
    df_empty = pd.DataFrame(vacancies_empty)
    df_errors = pd.DataFrame({'id': error_ids})
    
    df_skills.to_csv('vacancies_with_skills.csv', index=False, encoding='utf-8')
    df_empty.to_csv('vacancies_empty.csv', index=False, encoding='utf-8')
    df_errors.to_csv('error_vacancies.csv', index=False, encoding='utf-8')
    
    return df_skills, df_empty, df_errors

def main():
    print("Fetching vacancy IDs...")
    vacancy_ids = fetch_vacancies(search_term='лаборант', pages=15, per_page=100)
    print(f"Found {len(vacancy_ids)} vacancies")
    
    print("\nProcessing vacancies...")
    vacancies_with_skills, vacancies_empty, error_ids = process_vacancies(vacancy_ids)
    
    print("\nSaving results...")
    df_skills, df_empty, df_errors = save_results(vacancies_with_skills, vacancies_empty, error_ids)
    
    print("\nSummary:")
    print(f"- Vacancies with skills: {len(df_skills)}")
    print(f"- Vacancies without skills: {len(df_empty)}")
    print(f"- Vacancies with errors: {len(df_errors)}")
    
    all_skills = [skill for sublist in df_skills['skills'] for skill in sublist]
    skills_counts = pd.Series(all_skills).value_counts().reset_index()
    skills_counts.columns = ['skill', 'count']
    skills_counts.to_json('skills_data.json', orient='records', force_ascii=False)

if __name__ == "__main__":
    main()
