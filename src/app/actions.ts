"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import https from "https";

async function fetchGovApi(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

export async function searchLicensePlate(formData: FormData) {
  const rawPlate = formData.get("plate") as string;
  if (!rawPlate) return;
  const plate = rawPlate.replace(/[^0-9]/g, ""); 

  if (!plate) redirect("/");

  let vehicle = await prisma.activeVehicle.findUnique({
    where: { licensePlate: plate },
  });

  if (!vehicle) {
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=053cea08-09bc-40ec-8f7a-156f0677aff3&filters={"mispar_rechev":"${plate}"}`;
    const json = await fetchGovApi(url);
    
    if (json.success && json.result.records.length > 0) {
      const record = json.result.records[0];
      
      const tozeretCd = Number(record.tozeret_cd);
      const degemCd = Number(record.degem_cd);
      
      let manufacturer = await prisma.manufacturer.findUnique({ where: { code: tozeretCd } });
      if (!manufacturer) {
        manufacturer = await prisma.manufacturer.create({
          data: { code: tozeretCd, name: String(record.tozeret_nm || 'Unknown').trim() }
        });
      }
      
      let carModel = await prisma.carModel.findUnique({
        where: { manufacturerId_code: { manufacturerId: manufacturer.id, code: degemCd } }
      });
      if (!carModel) {
        carModel = await prisma.carModel.create({
          data: { 
            manufacturerId: manufacturer.id, 
            code: degemCd, 
            name: String(record.degem_nm || 'Unknown').trim(), 
            commercialName: record.kinuy_mishari ? String(record.kinuy_mishari).trim() : null 
          }
        });
      }
      
      vehicle = await prisma.activeVehicle.create({
        data: {
          licensePlate: plate,
          manufacturerId: manufacturer.id,
          carModelId: carModel.id,
          color: record.tzeva_rechev ? String(record.tzeva_rechev).trim() : null,
          year: Number(record.shnat_yitzur) || null,
          ownership: record.baalut ? String(record.baalut).trim() : null,
          trimName: record.ramat_gimur ? String(record.ramat_gimur).trim() : null,
          testExpiry: record.tokef_dt ? new Date(record.tokef_dt) : null,
        }
      });
    }
  }
  
  if (vehicle) {
    redirect(`/plate/${plate}`);
  } else {
    redirect(`/?error=not_found`);
  }
}
