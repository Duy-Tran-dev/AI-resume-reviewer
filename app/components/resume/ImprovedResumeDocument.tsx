import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ImprovedResume } from "@/app/lib/groq";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  name: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
  section: { marginBottom: 12 },
  heading: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 4,
    borderBottom: "1 solid #999999",
    paddingBottom: 2,
  },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 10 },
  bulletText: { flex: 1 },
});

export function ImprovedResumeDocument({
  resume,
}: {
  resume: ImprovedResume;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{resume.name}</Text>
        {resume.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.bullets.map((bullet, bulletIndex) => (
              <View key={bulletIndex} style={styles.bulletRow}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
