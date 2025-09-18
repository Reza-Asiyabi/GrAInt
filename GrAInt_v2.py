# Enhanced GrAInt Features - Phase 2
# Additional modules and features for the Streamlit application

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import sqlite3
from datetime import datetime, timedelta
import hashlib
import base64
from typing import Dict, List, Tuple
import re
from textstat import flesch_reading_ease, flesch_kincaid_grade
import numpy as np
import json


# Database Manager for Persistent Storage
class DatabaseManager:
    def __init__(self, db_path: str = "graint_proposals.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Initialize the database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Projects table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            user_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'draft',
            funding_body TEXT,
            deadline DATE,
            budget_range TEXT
        )
        ''')

        # Sections table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            section_name TEXT,
            content TEXT,
            version INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
        ''')

        # User inputs table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_inputs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            input_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
        ''')

        # Reviews table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            review_content TEXT,
            review_score INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
        ''')

        conn.commit()
        conn.close()

    def save_project(self, title: str, user_inputs: dict, sections: dict,
                     user_id: str = "anonymous") -> int:
        """Save a complete project to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Insert project
        cursor.execute('''
        INSERT INTO projects (title, user_id, funding_body, budget_range)
        VALUES (?, ?, ?, ?)
        ''', (title, user_id, user_inputs.get('call_information', ''),
              user_inputs.get('budget_range', '')))

        project_id = cursor.lastrowid

        # Insert user inputs
        cursor.execute('''
        INSERT INTO user_inputs (project_id, input_data)
        VALUES (?, ?)
        ''', (project_id, json.dumps(user_inputs)))

        # Insert sections
        for section_name, content in sections.items():
            cursor.execute('''
            INSERT INTO sections (project_id, section_name, content)
            VALUES (?, ?, ?)
            ''', (project_id, section_name, content))

        conn.commit()
        conn.close()
        return project_id

    def load_project(self, project_id: int) -> Dict:
        """Load a project from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Get project info
        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        project = cursor.fetchone()

        if not project:
            return {}

        # Get user inputs
        cursor.execute('SELECT input_data FROM user_inputs WHERE project_id = ?', (project_id,))
        inputs_result = cursor.fetchone()
        user_inputs = json.loads(inputs_result[0]) if inputs_result else {}

        # Get sections
        cursor.execute('SELECT section_name, content FROM sections WHERE project_id = ?', (project_id,))
        sections_result = cursor.fetchall()
        sections = {row[0]: row[1] for row in sections_result}

        conn.close()

        return {
            'id': project[0],
            'title': project[1],
            'user_inputs': user_inputs,
            'sections': sections,
            'created_at': project[3]
        }

    def get_user_projects(self, user_id: str = "anonymous") -> List[Dict]:
        """Get all projects for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute('''
        SELECT id, title, created_at, updated_at, status, funding_body 
        FROM projects WHERE user_id = ? ORDER BY updated_at DESC
        ''', (user_id,))

        projects = cursor.fetchall()
        conn.close()

        return [{'id': p[0], 'title': p[1], 'created_at': p[2],
                 'updated_at': p[3], 'status': p[4], 'funding_body': p[5]} for p in projects]


# Analytics and Quality Assessment
class ProposalAnalyzer:
    def __init__(self):
        self.readability_benchmarks = {
            'excellent': (80, 100),
            'good': (70, 79),
            'average': (60, 69),
            'difficult': (30, 59),
            'very_difficult': (0, 29)
        }

    def analyze_proposal(self, sections: Dict[str, str]) -> Dict:
        """Comprehensive proposal analysis"""
        full_text = " ".join(sections.values())

        analysis = {
            'readability': self.analyze_readability(full_text),
            'structure': self.analyze_structure(sections),
            'keywords': self.analyze_keywords(full_text),
            'length_analysis': self.analyze_length(sections),
            'sentiment': self.analyze_tone(full_text)
        }

        return analysis

    def analyze_readability(self, text: str) -> Dict:
        """Analyze text readability"""
        try:
            flesch_score = flesch_reading_ease(text)
            fk_grade = flesch_kincaid_grade(text)

            # Determine readability level
            level = 'very_difficult'
            for level_name, (min_score, max_score) in self.readability_benchmarks.items():
                if min_score <= flesch_score <= max_score:
                    level = level_name
                    break

            return {
                'flesch_score': flesch_score,
                'fk_grade': fk_grade,
                'level': level,
                'recommendation': self.get_readability_recommendation(level)
            }
        except:
            return {
                'flesch_score': 0,
                'fk_grade': 0,
                'level': 'unknown',
                'recommendation': 'Unable to calculate readability'
            }

    def analyze_structure(self, sections: Dict[str, str]) -> Dict:
        """Analyze proposal structure"""
        expected_sections = ['title', 'abstract', 'background', 'objectives', 'methodology', 'expected_outcomes']
        present_sections = list(sections.keys())

        completeness = len([s for s in expected_sections if s in present_sections]) / len(expected_sections)

        structure_score = completeness * 100

        return {
            'completeness': completeness,
            'structure_score': structure_score,
            'missing_sections': [s for s in expected_sections if s not in present_sections],
            'extra_sections': [s for s in present_sections if s not in expected_sections]
        }

    def analyze_keywords(self, text: str) -> Dict:
        """Analyze keyword density and research terms"""
        words = re.findall(r'\b\w+\b', text.lower())
        word_freq = {}

        for word in words:
            if len(word) > 3:  # Only consider words longer than 3 characters
                word_freq[word] = word_freq.get(word, 0) + 1

        # Sort by frequency
        top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]

        # Research-specific terms
        research_terms = ['research', 'study', 'analysis', 'methodology', 'data', 'results',
                          'findings', 'hypothesis', 'experiment', 'investigation', 'approach']

        research_density = sum([word_freq.get(term, 0) for term in research_terms]) / len(words)

        return {
            'top_keywords': top_keywords,
            'research_density': research_density,
            'total_unique_words': len(word_freq),
            'total_words': len(words)
        }

    def analyze_length(self, sections: Dict[str, str]) -> Dict:
        """Analyze section lengths"""
        section_lengths = {section: len(content.split()) for section, content in sections.items()}

        # Recommended lengths (in words)
        recommended_lengths = {
            'title': (10, 15),
            'abstract': (200, 300),
            'background': (500, 800),
            'objectives': (200, 400),
            'methodology': (600, 1000),
            'expected_outcomes': (300, 500)
        }

        length_assessment = {}
        for section, length in section_lengths.items():
            if section in recommended_lengths:
                min_len, max_len = recommended_lengths[section]
                if length < min_len:
                    status = 'too_short'
                elif length > max_len:
                    status = 'too_long'
                else:
                    status = 'optimal'

                length_assessment[section] = {
                    'word_count': length,
                    'recommended_range': recommended_lengths[section],
                    'status': status
                }

        return length_assessment

    def analyze_tone(self, text: str) -> Dict:
        """Basic tone analysis"""
        # Simple sentiment indicators
        positive_words = ['innovative', 'novel', 'significant', 'important', 'breakthrough',
                          'excellent', 'outstanding', 'promising', 'valuable', 'effective']

        negative_words = ['difficult', 'challenging', 'limited', 'restricted', 'problematic',
                          'insufficient', 'inadequate', 'poor', 'weak', 'failed']

        confident_words = ['will', 'demonstrate', 'achieve', 'deliver', 'ensure', 'guarantee',
                           'establish', 'confirm', 'prove', 'show']

        tentative_words = ['may', 'might', 'could', 'possibly', 'potentially', 'perhaps',
                           'likely', 'probably', 'appear', 'seem']

        words = text.lower().split()

        positive_count = sum(1 for word in words if word in positive_words)
        negative_count = sum(1 for word in words if word in negative_words)
        confident_count = sum(1 for word in words if word in confident_words)
        tentative_count = sum(1 for word in words if word in tentative_words)

        total_indicator_words = positive_count + negative_count + confident_count + tentative_count

        if total_indicator_words == 0:
            return {'tone': 'neutral', 'confidence': 'moderate'}

        # Calculate ratios
        positivity_ratio = positive_count / total_indicator_words
        confidence_ratio = confident_count / (confident_count + tentative_count) if (
                                                                                                confident_count + tentative_count) > 0 else 0.5

        tone = 'positive' if positivity_ratio > 0.6 else 'negative' if positivity_ratio < 0.3 else 'neutral'
        confidence = 'high' if confidence_ratio > 0.7 else 'low' if confidence_ratio < 0.3 else 'moderate'

        return {
            'tone': tone,
            'confidence': confidence,
            'positivity_ratio': positivity_ratio,
            'confidence_ratio': confidence_ratio
        }

    def get_readability_recommendation(self, level: str) -> str:
        """Get readability recommendations"""
        recommendations = {
            'excellent': 'Excellent readability! Your proposal is very accessible.',
            'good': 'Good readability. Consider simplifying a few complex sentences.',
            'average': 'Average readability. Try using shorter sentences and simpler vocabulary.',
            'difficult': 'Text is quite difficult. Consider breaking up long sentences and using clearer language.',
            'very_difficult': 'Text is very difficult to read. Significant simplification needed.'
        }
        return recommendations.get(level, 'Unable to assess readability')


# Advanced Template System
class AdvancedTemplateManager:
    def __init__(self):
        self.templates = self.load_advanced_templates()

    def load_advanced_templates(self) -> Dict:
        """Load funding-body specific templates"""
        return {
            'UKRI_Standard': {
                'name': 'UKRI Standard Grant',
                'description': 'Standard UKRI research grant template',
                'sections': {
                    'case_for_support': 'Why this research is important and timely',
                    'methodology': 'Detailed research methodology and approach',
                    'management': 'Project management and timeline',
                    'impact': 'Academic and societal impact',
                    'resources': 'Justification of resources requested'
                },
                'requirements': {
                    'max_pages': 6,
                    'font_size': 11,
                    'margin': '2cm',
                    'references': 'Harvard style'
                }
            },
            'Horizon_Europe': {
                'name': 'Horizon Europe',
                'description': 'Horizon Europe research proposal template',
                'sections': {
                    'excellence': 'Scientific excellence of the proposal',
                    'impact': 'Expected impact and measures for success',
                    'implementation': 'Quality and efficiency of implementation'
                },
                'requirements': {
                    'max_pages': 70,
                    'font_size': 11,
                    'evaluation_criteria': ['Excellence', 'Impact', 'Implementation']
                }
            },
            'NSF_US': {
                'name': 'NSF (US)',
                'description': 'National Science Foundation proposal template',
                'sections': {
                    'project_description': 'Comprehensive project description',
                    'broader_impacts': 'Broader impacts of the research',
                    'data_management': 'Data management and sharing plan'
                },
                'requirements': {
                    'max_pages': 15,
                    'font_size': 10,
                    'format': 'Computer Modern or TeX Gyre Termes'
                }
            }
        }

    def get_template(self, template_name: str) -> Dict:
        """Get specific template"""
        return self.templates.get(template_name, {})

    def customize_template(self, template_name: str, customizations: Dict) -> Dict:
        """Customize a template based on user requirements"""
        base_template = self.get_template(template_name)
        if not base_template:
            return {}

        # Apply customizations
        customized = base_template.copy()
        if 'sections' in customizations:
            customized['sections'].update(customizations['sections'])

        return customized


# Collaboration Features
class CollaborationManager:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def create_shared_project(self, project_id: int, collaborators: List[str],
                              permissions: Dict[str, str]) -> bool:
        """Create a shared project with collaborators"""
        # This would integrate with a user management system
        # For now, it's a placeholder for the collaboration framework

        conn = sqlite3.connect(self.db.db_path)
        cursor = conn.cursor()

        # Create collaboration table if it doesn't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS collaborations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            collaborator_id TEXT,
            permission_level TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )
        ''')

        # Add collaborators
        for collaborator in collaborators:
            permission = permissions.get(collaborator, 'read')
            cursor.execute('''
            INSERT INTO collaborations (project_id, collaborator_id, permission_level)
            VALUES (?, ?, ?)
            ''', (project_id, collaborator, permission))

        conn.commit()
        conn.close()
        return True

    def get_collaboration_history(self, project_id: int) -> List[Dict]:
        """Get collaboration history for a project"""
        # Placeholder for collaboration history
        return []


# Integration with External Services
class ExternalIntegrations:
    def __init__(self):
        self.reference_apis = {
            'crossref': 'https://api.crossref.org/works',
            'pubmed': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
            'arxiv': 'http://export.arxiv.org/api/query'
        }

    def search_references(self, query: str, source: str = 'crossref') -> List[Dict]:
        """Search for academic references"""
        # This would implement actual API calls to reference databases
        # For now, it's a placeholder structure

        placeholder_references = [
            {
                'title': f'Research on {query}',
                'authors': ['Smith, J.', 'Johnson, A.'],
                'year': 2023,
                'journal': 'Nature',
                'doi': '10.1038/example'
            }
        ]

        return placeholder_references

    def check_funding_opportunities(self, keywords: List[str]) -> List[Dict]:
        """Check for relevant funding opportunities"""
        # This would integrate with funding databases
        placeholder_opportunities = [
            {
                'title': 'UKRI Future Leaders Fellowship',
                'deadline': '2024-03-15',
                'amount': '£1.5M',
                'match_score': 0.85
            }
        ]

        return placeholder_opportunities

    def export_to_funding_portal(self, proposal_data: Dict, portal: str) -> bool:
        """Export proposal directly to funding portal"""
        # This would implement API integration with funding portals
        # Currently a placeholder
        return True


# Enhanced Streamlit Components
def show_analytics_dashboard():
    """Advanced analytics dashboard"""
    st.markdown('<h2 class="section-header">📊 Analytics Dashboard</h2>', unsafe_allow_html=True)

    if not st.session_state.proposal_sections:
        st.warning("⚠️ Generate proposal sections first to see analytics.")
        return

    # Initialize analyzer
    analyzer = ProposalAnalyzer()
    analysis = analyzer.analyze_proposal(st.session_state.proposal_sections)

    # Readability Metrics
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        flesch_score = analysis['readability']['flesch_score']
        st.metric(
            label="Readability Score",
            value=f"{flesch_score:.1f}",
            delta=f"{analysis['readability']['level'].title()}"
        )

    with col2:
        structure_score = analysis['structure']['structure_score']
        st.metric(
            label="Structure Score",
            value=f"{structure_score:.1f}%",
            delta=f"{len(analysis['structure']['missing_sections'])} missing"
        )

    with col3:
        word_count = analysis['keywords']['total_words']
        st.metric(
            label="Total Words",
            value=f"{word_count:,}",
            delta=f"{analysis['keywords']['research_density']:.2%} research terms"
        )

    with col4:
        unique_words = analysis['keywords']['total_unique_words']
        diversity = unique_words / word_count if word_count > 0 else 0
        st.metric(
            label="Vocabulary Diversity",
            value=f"{diversity:.2%}",
            delta="Good" if diversity > 0.3 else "Improve"
        )

    # Visualizations
    st.markdown("### 📈 Detailed Analysis")

    # Section length analysis
    if analysis['length_analysis']:
        st.markdown("#### Section Length Analysis")

        length_data = []
        for section, data in analysis['length_analysis'].items():
            length_data.append({
                'Section': section.title(),
                'Word Count': data['word_count'],
                'Min Recommended': data['recommended_range'][0],
                'Max Recommended': data['recommended_range'][1],
                'Status': data['status'].replace('_', ' ').title()
            })

        df_lengths = pd.DataFrame(length_data)

        fig = go.Figure()

        # Add bars for actual word counts
        fig.add_trace(go.Bar(
            name='Actual',
            x=df_lengths['Section'],
            y=df_lengths['Word Count'],
            marker_color=['green' if status == 'Optimal' else 'orange' if 'Short' in status else 'red'
                          for status in df_lengths['Status']]
        ))

        # Add range indicators
        fig.add_trace(go.Scatter(
            name='Min Recommended',
            x=df_lengths['Section'],
            y=df_lengths['Min Recommended'],
            mode='markers',
            marker=dict(symbol='diamond', size=8, color='blue')
        ))

        fig.add_trace(go.Scatter(
            name='Max Recommended',
            x=df_lengths['Section'],
            y=df_lengths['Max Recommended'],
            mode='markers',
            marker=dict(symbol='diamond', size=8, color='red')
        ))

        fig.update_layout(
            title='Section Length vs. Recommendations',
            xaxis_title='Sections',
            yaxis_title='Word Count',
            hovermode='x unified'
        )

        st.plotly_chart(fig, use_container_width=True)

    # Keyword frequency
    if analysis['keywords']['top_keywords']:
        st.markdown("#### Top Keywords")

        keywords_df = pd.DataFrame(
            analysis['keywords']['top_keywords'][:10],
            columns=['Keyword', 'Frequency']
        )

        fig_keywords = px.bar(
            keywords_df,
            x='Frequency',
            y='Keyword',
            orientation='h',
            title='Most Frequent Keywords'
        )

        fig_keywords.update_layout(height=400)
        st.plotly_chart(fig_keywords, use_container_width=True)

    # Recommendations
    st.markdown("#### 🎯 Recommendations")

    recommendations = []

    # Readability recommendations
    recommendations.append(f"**Readability**: {analysis['readability']['recommendation']}")

    # Structure recommendations
    if analysis['structure']['missing_sections']:
        missing = ', '.join(analysis['structure']['missing_sections'])
        recommendations.append(f"**Structure**: Consider adding these sections: {missing}")

    # Length recommendations
    length_issues = [f"{section}: {data['status'].replace('_', ' ')}"
                     for section, data in analysis['length_analysis'].items()
                     if data['status'] != 'optimal']

    if length_issues:
        recommendations.append(f"**Length**: {'; '.join(length_issues)}")

    # Tone recommendations
    tone_info = analysis['sentiment']
    if tone_info['confidence'] == 'low':
        recommendations.append("**Tone**: Consider using more confident language to strengthen your proposal")

    for i, rec in enumerate(recommendations, 1):
        st.markdown(f"{i}. {rec}")


def show_project_management():
    """Project management interface"""
    st.markdown('<h2 class="section-header">📁 Project Management</h2>', unsafe_allow_html=True)

    # Initialize database manager
    if 'db_manager' not in st.session_state:
        st.session_state.db_manager = DatabaseManager()

    db = st.session_state.db_manager

    # Project list
    projects = db.get_user_projects()

    if projects:
        st.markdown("### Your Projects")

        # Create a DataFrame for better display
        projects_df = pd.DataFrame(projects)
        projects_df['created_at'] = pd.to_datetime(projects_df['created_at'])
        projects_df = projects_df.sort_values('created_at', ascending=False)

        # Display projects
        for _, project in projects_df.iterrows():
            with st.expander(f"📄 {project['title']} ({project['created_at'].strftime('%Y-%m-%d')})"):
                col1, col2, col3 = st.columns([2, 1, 1])

                with col1:
                    st.write(f"**Status:** {project['status'].title()}")
                    st.write(f"**Funding Body:** {project['funding_body'] or 'Not specified'}")

                with col2:
                    if st.button(f"Load", key=f"load_{project['id']}"):
                        loaded_project = db.load_project(project['id'])
                        st.session_state.user_inputs = loaded_project['user_inputs']
                        st.session_state.proposal_sections = loaded_project['sections']
                        st.success(f"Project '{project['title']}' loaded!")

                with col3:
                    if st.button(f"Delete", key=f"delete_{project['id']}"):
                        # Add confirmation logic here
                        st.warning("Delete functionality would be implemented here")
    else:
        st.info("No saved projects yet. Create your first proposal!")

    # Save current project
    st.markdown("### Save Current Project")

    if st.session_state.proposal_sections:
        project_title = st.text_input("Project Title",
                                      value=st.session_state.proposal_sections.get('title', 'Untitled Project'))

        if st.button("💾 Save Project"):
            project_id = db.save_project(
                title=project_title,
                user_inputs=st.session_state.user_inputs,
                sections=st.session_state.proposal_sections
            )
            st.success(f"Project saved with ID: {project_id}")
    else:
        st.info("Generate some proposal sections first to save a project.")


def show_collaboration_tools():
    """Collaboration tools interface"""
    st.markdown('<h2 class="section-header">👥 Collaboration Tools</h2>', unsafe_allow_html=True)

    st.info("🚧 Collaboration features coming soon!")

    # Placeholder for collaboration features
    st.markdown("### Planned Features")

    features = [
        "**Real-time Editing**: Multiple users can edit the same proposal simultaneously",
        "**Comment System**: Add comments and suggestions to specific sections",
        "**Version History**: Track changes and revert to previous versions",
        "**User Permissions**: Control who can view, edit, or comment on proposals",
        "**Notification System**: Get notified when collaborators make changes",
        "**Export Permissions**: Control who can download the final proposal"
    ]

    for feature in features:
        st.markdown(f"• {feature}")

    # Mock collaboration interface
    st.markdown("### Mock Collaboration Interface")

    with st.expander("👥 Invite Collaborators", expanded=False):
        col1, col2 = st.columns([2, 1])

        with col1:
            collaborator_email = st.text_input("Collaborator Email")

        with col2:
            permission_level = st.selectbox("Permission", ["View", "Comment", "Edit", "Admin"])

        if st.button("Send Invitation"):
            st.success(f"Invitation sent to {collaborator_email} with {permission_level} permissions!")

    # Mock activity feed
    st.markdown("### Recent Activity")

    mock_activities = [
        {"user": "john.smith@university.edu", "action": "edited", "section": "Methodology", "time": "2 hours ago"},
        {"user": "mary.johnson@research.org", "action": "commented on", "section": "Background", "time": "5 hours ago"},
        {"user": "alex.wilson@institute.ac.uk", "action": "added", "section": "References", "time": "1 day ago"}
    ]

    for activity in mock_activities:
        st.markdown(f"• **{activity['user']}** {activity['action']} *{activity['section']}* - {activity['time']}")


# Add these functions to the main application navigation
def enhanced_show_main_page():
    """Enhanced main page with additional navigation options"""

    # Add new navigation options
    enhanced_pages = [
        "📝 Input Information",
        "🔧 Generate Proposal",
        "🔍 Review & Revise",
        "📊 Analytics Dashboard",
        "📁 Project Management",
        "👥 Collaboration Tools",
        "💾 Export Results"
    ]

    page = st.sidebar.radio("Choose a section:", enhanced_pages)

    # Route to appropriate function
    if page == "📊 Analytics Dashboard":
        show_analytics_dashboard()
    elif page == "📁 Project Management":
        show_project_management()
    elif page == "👥 Collaboration Tools":
        show_collaboration_tools()
    # ... other existing pages remain the same