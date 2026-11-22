"""Projection Neo4j des annonces et des références (catégories, marques)."""
from app.db.neo4j_db import run


def publish_product(listing_id: str, seller_id: str, category_id: int, brand_id: int):
    run("""
        MATCH (u:User {id: $seller}), (c:Category {id: $cat}), (b:Brand {id: $brand})
        MERGE (p:Product {id: $id}) ON CREATE SET p.status = 'active'
        MERGE (u)-[:PUBLISHED]->(p)
        MERGE (p)-[:IN_CATEGORY]->(c)
        MERGE (p)-[:HAS_BRAND]->(b)
        """, id=listing_id, seller=seller_id, cat=category_id, brand=brand_id)


def set_status(listing_id: str, status: str):
    run("MATCH (p:Product {id: $id}) SET p.status = $status", id=listing_id, status=status)


def change_category(listing_id: str, category_id: int):
    run("""
        MATCH (p:Product {id: $id}), (c:Category {id: $cat})
        OPTIONAL MATCH (p)-[r:IN_CATEGORY]->()
        DELETE r
        WITH DISTINCT p, c
        MERGE (p)-[:IN_CATEGORY]->(c)
        """, id=listing_id, cat=category_id)


def change_brand(listing_id: str, brand_id: int):
    run("""
        MATCH (p:Product {id: $id}), (b:Brand {id: $brand})
        OPTIONAL MATCH (p)-[r:HAS_BRAND]->()
        DELETE r
        WITH DISTINCT p, b
        MERGE (p)-[:HAS_BRAND]->(b)
        """, id=listing_id, brand=brand_id)


def upsert_ref(label: str, ref_id: int, name: str, slug: str):
    # label vient du code (Category | Brand), jamais de l'utilisateur
    run(f"MERGE (n:{label} {{id: $id}}) SET n.name = $name, n.slug = $slug",
        id=ref_id, name=name, slug=slug)


def delete_ref(label: str, ref_id: int):
    run(f"MATCH (n:{label} {{id: $id}}) DETACH DELETE n", id=ref_id)