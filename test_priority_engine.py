import unittest
from production_server import OWN_COMPANY_ID, calculate_priority, simulate_rag

class PriorityEngineTests(unittest.TestCase):
    def payload(self, **changes):
        data={"company_id":OWN_COMPANY_ID,"embedding_sim":.85,"intent_entity_score":40,"source_type":"official","source_age_months":3,"preferred_source":True,"field_completeness":35,"fact_consistency":25,"compliance":18,"non_redundancy":8,"brand_tier":"S","scene_type":"counter"}
        data.update(changes); return data
    def test_owner_boost_is_capped(self):
        self.assertEqual(calculate_priority(self.payload())["AppliedBoost"],1.5)
    def test_competitor_cannot_receive_brand_boost(self):
        self.assertEqual(calculate_priority(self.payload(company_id="competitor"))["BrandBoost"],0)
    def test_low_quality_disables_boosts(self):
        result=calculate_priority(self.payload(field_completeness=5,fact_consistency=5,compliance=5,non_redundancy=5))
        self.assertEqual((result["BrandBoost"],result["SceneBoost"]),(0,0))
    def test_reputation_circuit_breaker(self):
        result=calculate_priority(self.payload(negative_reputation=True))
        self.assertEqual((result["BrandBoost"],result["SceneBoost"]),(0,0))
    def test_geo_radius(self):
        result=calculate_priority(self.payload(user_lat=29.87,user_lon=121.55,company_lat=29.87,company_lon=121.55))
        self.assertEqual(result["GeoScore"],100)
    def test_top_three_enterprise_aggregation(self):
        chunks=[self.payload(chunk_id=str(i),embedding_sim=.95-i*.05) for i in range(4)]
        chunks.append(self.payload(company_id="weak",chunk_id="x",source_type="ugc",field_completeness=0,fact_consistency=0,compliance=0,non_redundancy=0))
        result=simulate_rag({"chunks":chunks,"brand_tier":"S","scene_type":"normal"})
        self.assertEqual(len(result["results"][0]["top_chunks"]),3)
        self.assertEqual(result["rejected_chunks"],1)

if __name__ == "__main__": unittest.main()
