"""Offline grid search for the GEO chunk-to-enterprise ranker (stdlib only)."""
import argparse, csv, itertools, json, math
from collections import defaultdict

WEIGHT_SETS=((.5,.3,.2),(.6,.3,.1))

def dcg(labels,k=3):
    return sum((2**x-1)/math.log2(i+2) for i,x in enumerate(labels[:k]))

def ndcg(labels,k=3):
    ideal=dcg(sorted(labels,reverse=True),k)
    return dcg(labels,k)/ideal if ideal else 0.0

def truth(v): return str(v).strip().lower() in ("1","true","yes","y")

def score(row,alpha,w_source,trust_cutoff,match_cutoff):
    match=alpha*float(row["emb_sim"])*100+(1-alpha)*float(row["entity_score"])
    trust=w_source*float(row["source_score"])+(1-w_source)*float(row["content_score"])
    base=match*float(row["geo_score"])*trust/(100**3)*1000
    boost=0
    if truth(row["is_own_company"]) and trust>=trust_cutoff and match>=match_cutoff:
        boost=min(1.5,float(row["brand_boost"])+float(row["scene_boost"]))
    return {**row,"match":match,"trust":trust,"base":base,"final":min(1000,base*(1+boost)),"label":int(row["rel_label"])}

def aggregate(rows,weights):
    companies=defaultdict(list)
    for row in rows: companies[row["company_id"]].append(row)
    result=[]
    for company,chunks in companies.items():
        top=sorted(chunks,key=lambda x:x["base"],reverse=True)[:3]
        active=weights[:len(top)]; total=sum(active)
        final=sum(x["final"]*w for x,w in zip(top,active))/total
        result.append({"company_id":company,"final":final,"label":max(x["label"] for x in top),"trust":sum(x["trust"]*w for x,w in zip(top,active))/total})
    return sorted(result,key=lambda x:x["final"],reverse=True)

def evaluate(dataset,alpha,w_source,tc,mc,weights):
    queries=defaultdict(list)
    for row in dataset: queries[row["query_id"]].append(score(row,alpha,w_source,tc,mc))
    metrics=[]
    for rows in queries.values():
        ranked=aggregate(rows,weights); top=ranked[:3]; labels=[x["label"] for x in ranked]
        metrics.append((ndcg(labels,3),sum(x["label"]>=1 for x in top)/max(1,len(top)),sum(x["trust"]<tc for x in top)/max(1,len(top))))
    n=max(1,len(metrics)); return tuple(sum(x[i] for x in metrics)/n for i in range(3))

def main():
    parser=argparse.ArgumentParser(); parser.add_argument("dataset"); parser.add_argument("--output",default="grid_search_result.csv"); args=parser.parse_args()
    with open(args.dataset,encoding="utf-8-sig",newline="") as f: data=list(csv.DictReader(f))
    required={"query_id","company_id","emb_sim","entity_score","source_score","content_score","geo_score","is_own_company","brand_boost","scene_boost","rel_label"}
    missing=required-set(data[0] if data else [])
    if missing: raise SystemExit("缺少字段: "+", ".join(sorted(missing)))
    results=[]
    for alpha,ws,tc,mc,weights in itertools.product((.5,.6,.7,.8,.9),(.4,.5,.6,.7,.8),(30,40,50),(30,40,50),WEIGHT_SETS):
        n,p,low=evaluate(data,alpha,ws,tc,mc,weights)
        results.append({"alpha":alpha,"w_source":ws,"trust_cutoff":tc,"match_cutoff":mc,"aggregation_weights":json.dumps(weights),"avg_ndcg@3":round(n,6),"avg_p@3":round(p,6),"avg_lowtrust_top3_ratio":round(low,6)})
    results.sort(key=lambda x:(-x["avg_ndcg@3"],x["avg_lowtrust_top3_ratio"],-x["avg_p@3"]))
    with open(args.output,"w",encoding="utf-8-sig",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=results[0]); writer.writeheader(); writer.writerows(results)
    print(json.dumps(results[:10],ensure_ascii=False,indent=2)); print(f"已输出 {args.output}")

if __name__=="__main__": main()
