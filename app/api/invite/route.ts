import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, password, role, accessLevel, companyLogo, brandColor1, brandColor2, companyName } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const primaryColor = brandColor1 || '#0A58CA';
        const secondaryBg = brandColor2 || '#f4f5f7';
        const logoSrc = companyLogo || 'https://firebasestorage.googleapis.com/v0/b/red-girder-461916-a1.firebasestorage.app/o/logo-blue.png?alt=media';

        const resendOptions = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev",
                to: [email],
                subject: `Welcome to ${companyName} via Sama Kerr Suite`,
                html: `
                    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; padding: 40px 20px; color: #121212; background-color: #f9fafb; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <div style="text-align: center; margin-bottom: 32px; padding: 24px; background: ${secondaryBg}20; border-radius: 8px;">
                            <img src="${logoSrc}" alt="${companyName} Logo" style="height: 60px; width: auto; max-width: 200px; object-fit: contain;" />
                        </div>
                        <h2 style="color: ${primaryColor}; font-size: 24px; text-align: center; margin-bottom: 8px; font-weight: 700;">Welcome to ${companyName}</h2>
                        <p style="text-align: center; color: #4a4a4a; font-size: 15px; margin-bottom: 32px; line-height: 1.5;">You have been invited to collaborate and manage properties on our platform, powered by Sama Kerr.</p>
                        
                        <div style="background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                            <div style="margin-bottom: 24px;">
                                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Role Assigned</p>
                                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">${role}</p>
                            </div>
                            <div style="margin-bottom: 24px;">
                                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Access Level</p>
                                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a; display: inline-block; padding: 4px 12px; background: ${primaryColor}15; color: ${primaryColor}; border-radius: 999px;">${accessLevel}</p>
                            </div>
                            
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                            
                            <h3 style="font-size: 15px; color: #0f172a; margin-top: 0; margin-bottom: 16px; font-weight: 600;">Temporary Login Credentials:</h3>
                            <div style="background: #f8fafc; border-left: 4px solid ${primaryColor}; padding: 16px 20px; border-radius: 0 6px 6px 0;">
                                <p style="margin: 0 0 12px 0; font-family: ui-monospace, monospace; font-size: 14px; color: #334155;"><strong>Email:</strong> <span style="color: #0f172a;">${email}</span></p>
                                <p style="margin: 0; font-family: ui-monospace, monospace; font-size: 14px; color: #334155;"><strong>Password:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0f172a;">${password}</span></p>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 40px;">
                            <a href="http://localhost:3000/auth" style="display: inline-block; padding: 14px 36px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px ${primaryColor}40;">Access Workspace Now</a>
                            <p style="margin-top: 24px; font-size: 13px; color: #64748b; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">For security purposes, please log in immediately and change your temporary password.</p>
                        </div>
                    </div>
                `
            })
        };

        const res = await fetch('https://api.resend.com/emails', resendOptions);

        if (!res.ok) {
            const errBody = await res.json();
            throw new Error(errBody.message || "Failed to dispatch email");
        }

        const data = await res.json();
        return NextResponse.json({ success: true, id: data.id });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
