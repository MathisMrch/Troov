from neo4j import GraphDatabase

from app.config import settings

driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))


def run(query: str, **params) -> list[dict]:
    """Exécute une requête Cypher et renvoie les lignes sous forme de dictionnaires."""
    with driver.session() as session:
        return session.run(query, **params).data()
